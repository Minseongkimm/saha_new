/// <reference lib="deno.ns" />

// @deno-types="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/module/index.d.ts"
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { createOpenAIStream } from "../_shared/openai-streaming.ts";
import { getStreamingHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import {
  createErrorResponse,
  StreamingError,
  validateEnvVars,
  validateRequest,
} from "../_shared/error-handler.ts";
import { AI_CONFIG, getEnvVar, log } from "../_shared/config.ts";
import { OpenAIMessage } from "../_shared/types.ts";
import { formatTokenUsage } from "../_shared/token-calculator.ts";
import { getKoreanDateString } from "../_shared/korean-date.ts";

type SupabaseDatabaseClient = ReturnType<typeof createClient>;

interface ConfigRow {
  key: string;
  value: string;
}

interface ExpertInfoRecord {
  id?: string;
  name?: string;
  expert_quote?: string;
  signature_phrase?: string;
}

interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  prompt_tokens_details?: { cached_tokens?: number };
  cache_write_tokens?: number;
}

interface StreamSummaryUpdateParams {
  apiKey: string;
  supabase: SupabaseDatabaseClient;
  roomId: string;
  messages: OpenAIMessage[];
  assistantResponse: string;
  existingSummary: string | null;
  lastSummaryMessageCount: number;
  completedMessageCount: number;
}

interface BuildUserPromptParams {
  expertSummary?: string;
  sajuSummary: string;
  roomContext?: string;
  conversationSummary?: string | null;
  historyLines: string[];
  currentQuestion: string;
}

const SYSTEM_PROMPT_BASE_KEY = "chat_system_prompt";
const SYSTEM_PROMPT_CATEGORY_PREFIX = "chat_system_prompt_";
const SYSTEM_PROMPT_EXPERT_PREFIX = "chat_system_prompt_expert_";
const FALLBACK_SYSTEM_PROMPT =
  "당신은 전문 사주 상담가입니다. 제공된 정보를 바탕으로 공감 가면서도 실생활에 도움이 되는 조언을 전달하세요.";
const SUMMARY_UPDATE_INTERVAL_MESSAGES = 4;
const SUMMARY_MAX_CHARS = 750;
const SUMMARY_INPUT_MESSAGE_LIMIT = 8;
const RECENT_HISTORY_MESSAGE_LIMIT = 2;
const HISTORY_USER_MAX_CHARS = 300;
const HISTORY_ASSISTANT_MAX_CHARS = 400;
const DECISION_COUNSELING_GUIDE = `
### Runtime Priority

DB base/expert prompt를 기본으로 따르되, 정보가 충돌하면 현재 질문과 최근 대화를 가장 우선하세요.
사주, 상담 메모리, 도사 페르소나는 답변을 보조하는 배경입니다. 현재 질문을 과거 주제나 도사의 전문 분야로 고정하지 마세요.

### 응답 길이 제한 (필수 준수)
- 전체 응답(본문 + 팔로업 질문 섹션 전부 포함, 공백 포함)은 800자를 넘지 않아야 합니다.
- 절대 문장 중간에서 끊지 마세요. 반드시 완결된 문장으로 마무리하세요.
- 하고 싶은 말이 많더라도 핵심만 압축해서 800자 안에서 기승전결 있게 마무리하고, 나머지는 팔로업 질문으로 자연스럽게 유도하세요.
- 팔로업 질문은 본문을 다 쓴 뒤 남는 분량 안에서만 작성하고, 분량이 부족하면 질문 개수를 줄이세요.
`;

/**
 * Reduce message text length while keeping key intent for history preview.
 */
function truncateMessage(content: string, maxLength: number = 120): string {
  const compact = content.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) {
    return compact;
  }
  return `${compact.slice(0, maxLength - 3)}...`;
}

function stripFollowUpQuestions(content: string): string {
  return content
    .replace(/\n*\s*팔로업\s*질문\s*[:：][\s\S]*$/i, "")
    .replace(/\n*\s*추천\s*질문\s*[:：][\s\S]*$/i, "")
    .replace(/\n*\s*다음\s*질문\s*[:：][\s\S]*$/i, "")
    .replace(/\n*\s*\[\s*["'][\s\S]*$/i, "")
    .trim();
}

function extractAssistantHistoryContext(content: string): string {
  const withoutFollowUps = stripFollowUpQuestions(content);
  const paragraphs = withoutFollowUps
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter((paragraph) => paragraph.length > 0);

  if (paragraphs.length === 0) {
    return truncateMessage(withoutFollowUps, HISTORY_ASSISTANT_MAX_CHARS);
  }

  const selected = [
    ...paragraphs.slice(0, 2),
    paragraphs.length > 2 ? paragraphs[paragraphs.length - 1] : "",
  ].filter((paragraph, index, array) =>
    paragraph.length > 0 && array.indexOf(paragraph) === index
  );

  return truncateMessage(selected.join(" "), HISTORY_ASSISTANT_MAX_CHARS);
}

function clampConversationSummary(
  summary: string,
  maxLength: number = SUMMARY_MAX_CHARS,
): string {
  const compact = summary
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (compact.length <= maxLength) {
    return compact;
  }
  return `${compact.slice(0, maxLength - 3).trim()}...`;
}

function formatSummaryInputMessages(messages: OpenAIMessage[]): string {
  return messages
    .slice(-SUMMARY_INPUT_MESSAGE_LIMIT)
    .map((message) => {
      const role = message.role === "assistant" ? "AI" : "사용자";
      return `${role}: ${
        truncateMessage(
          message.content,
          message.role === "assistant" ? 700 : 700,
        )
      }`;
    })
    .join("\n");
}

function formatListItems(items: unknown[], maxEntries: number): string {
  return [...new Set(items.map((item) => String(item)).filter(Boolean))]
    .slice(0, maxEntries)
    .join(", ");
}

/**
 * Summarize only the active and next daewoon to keep the saju context small.
 */
function formatRelevantDaewoon(
  value: unknown,
  currentYear: number = new Date().getFullYear(),
): string {
  if (!Array.isArray(value)) {
    return "";
  }
  const entries = (value as Array<Record<string, unknown>>)
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      year: typeof item.year === "number" ? item.year : Number(item.year),
      age: item.age,
      ganji: item.ganji ? String(item.ganji) : "",
    }))
    .filter((item) => item.ganji);

  if (entries.length === 0) {
    return "";
  }

  let currentIndex =
    entries.findIndex((item) =>
      Number.isFinite(item.year) && item.year > currentYear
    ) - 1;
  if (currentIndex < 0) {
    for (let i = entries.length - 1; i >= 0; i -= 1) {
      if (Number.isFinite(entries[i].year) && entries[i].year <= currentYear) {
        currentIndex = i;
        break;
      }
    }
  }
  if (currentIndex < 0) {
    currentIndex = 0;
  }

  const current = entries[currentIndex];
  const next = entries[currentIndex + 1];
  const formatEntry = (
    label: string,
    entry?: { year: number; age: unknown; ganji: string },
  ) => {
    if (!entry) {
      return "";
    }
    const year = Number.isFinite(entry.year) ? `${entry.year}년` : "";
    const age = entry.age !== undefined && entry.age !== null
      ? `${entry.age}세`
      : "";
    const detail = [age, year].filter(Boolean).join("/");
    return `${label}:${entry.ganji}${detail ? `(${detail})` : ""}`;
  };

  return [formatEntry("current", current), formatEntry("next", next)].filter(
    Boolean,
  ).join(", ");
}

function formatCoreFiveProperties(value: unknown): string {
  const record = parseJsonField<Record<string, unknown>>(value);
  if (!record) {
    return "";
  }
  const properties = [
    ["year", record.yearProperty],
    ["month", record.monthProperty],
    ["day", record.dayProperty],
    ["time", record.timeProperty],
  ]
    .filter(([, property]) => typeof property === "string" && property)
    .map(([label, property]) => `${label}:${property}`);
  return properties.join(", ");
}

function formatSinsalSummary(value: unknown): string {
  const record = parseJsonField<Record<string, unknown>>(value);
  if (!record) {
    return "";
  }
  return formatListItems(
    Object.values(record).flatMap((item) => Array.isArray(item) ? item : []),
    4,
  );
}

function formatGuinSummary(value: unknown): string {
  const record = parseJsonField<Record<string, unknown>>(value);
  if (!record) {
    return "";
  }
  return formatListItems(Object.keys(record), 4);
}

function formatRelationSummary(value: unknown): string {
  const record = parseJsonField<Record<string, unknown>>(value);
  if (!record) {
    return "";
  }
  const relationParts = ["육합", "삼합", "방합", "육충", "삼형"]
    .map((key) => {
      const items = record[key];
      return Array.isArray(items) && items.length > 0
        ? `${key}:${items.join(",")}`
        : "";
    })
    .filter(Boolean);
  return relationParts.length > 0 ? relationParts.join(", ") : "큰 합/충 없음";
}

/**
 * Build the condensed saju context section for the user prompt.
 */
function buildSajuSummary(data: Record<string, unknown>): string {
  const lines: string[] = [];
  const year = typeof data.yearHangulGanji === "string"
    ? data.yearHangulGanji
    : "";
  const month = typeof data.monthHangulGanji === "string"
    ? data.monthHangulGanji
    : "";
  const day = typeof data.dayHangulGanji === "string"
    ? data.dayHangulGanji
    : "";
  const time = typeof data.timeHangulGanji === "string"
    ? data.timeHangulGanji
    : "";
  const pillars = [year, month, day, time].filter(Boolean).join(" ");
  if (pillars) {
    lines.push(`Pillars: ${pillars}`);
  }
  const stemSasin = Array.isArray(data.stemSasin)
    ? (data.stemSasin as string[]).filter(Boolean).join(", ")
    : "";
  if (stemSasin) {
    lines.push(`StemSasin: ${stemSasin}`);
  }
  const branchSasin = Array.isArray(data.branchSasin)
    ? (data.branchSasin as string[]).filter(Boolean).join(", ")
    : "";
  if (branchSasin) {
    lines.push(`BranchSasin: ${branchSasin}`);
  }
  const fiveElements = formatCoreFiveProperties(data.fiveProperties);
  if (fiveElements) {
    lines.push(`FiveElements: ${fiveElements}`);
  }
  const sinsal = formatSinsalSummary(data.sinsal);
  if (sinsal) {
    lines.push(`Sinsal: ${sinsal}`);
  }
  const guin = formatGuinSummary(data.guin);
  if (guin) {
    lines.push(`Guin: ${guin}`);
  }
  const relations = formatRelationSummary(data.jijiRelations);
  if (relations) {
    lines.push(`JijiRelations: ${relations}`);
  }
  const daewoon = formatRelevantDaewoon(data.daewoon);
  if (daewoon) {
    lines.push(`Daewoon: ${daewoon}`);
  }
  lines.push("UsageRule: Use only fields relevant to the current question.");
  // 궁합 상담인 경우 상대방 사주 데이터 추가
  const partnerSajuData = (data as Record<string, unknown>)?.partnerSajuData as
    | Record<string, unknown>
    | undefined;
  if (partnerSajuData && typeof partnerSajuData === "object") {
    const partnerInfo = (data as Record<string, unknown>)?.partnerInfo as {
      name?: string;
    } | undefined;
    const partnerName = partnerInfo?.name || "상대방";
    lines.push(`\n### Partner Saju (${partnerName})`);
    const partnerSummary = buildPartnerSajuSummary(partnerSajuData);
    if (partnerSummary && partnerSummary.length > 0) {
      lines.push(partnerSummary);
    }
  }
  const partnerFlags = formatPartnerCompatibilityFlags(
    (data as Record<string, unknown>)?.partnerCompatibilityFlags,
  );
  if (partnerFlags) {
    lines.push(`PartnerCompatibility: ${partnerFlags}`);
  }

  return lines.join("\n");
}

function textField(
  data: Record<string, unknown>,
  camelKey: string,
  snakeKey: string,
): string {
  const camel = data[camelKey];
  if (typeof camel === "string") return camel;
  const snake = data[snakeKey];
  return typeof snake === "string" ? snake : "";
}

/**
 * Build partner saju summary (핵심 정보만 추출)
 */
function buildPartnerSajuSummary(partnerData: Record<string, unknown>): string {
  if (!partnerData || typeof partnerData !== "object") {
    return "";
  }
  const lines: string[] = [];

  // 1. Pillars (필수)
  const year = textField(partnerData, "yearHangulGanji", "year_hangul_ganji");
  const month = textField(
    partnerData,
    "monthHangulGanji",
    "month_hangul_ganji",
  );
  const day = textField(partnerData, "dayHangulGanji", "day_hangul_ganji");
  const time = textField(partnerData, "timeHangulGanji", "time_hangul_ganji");
  const pillars = [year, month, day, time].filter(Boolean).join(" ");
  if (pillars) {
    lines.push(`Pillars: ${pillars}`);
  }

  // 2. StemSasin, BranchSasin (필수)
  const stemSasinValue = partnerData.stemSasin ?? partnerData.stem_sasin;
  const stemSasin = Array.isArray(stemSasinValue)
    ? (stemSasinValue as string[]).filter(Boolean).join(", ")
    : "";
  if (stemSasin) {
    lines.push(`StemSasin: ${stemSasin}`);
  }
  const branchSasinValue = partnerData.branchSasin ?? partnerData.branch_sasin;
  const branchSasin = Array.isArray(branchSasinValue)
    ? (branchSasinValue as string[]).filter(Boolean).join(", ")
    : "";
  if (branchSasin) {
    lines.push(`BranchSasin: ${branchSasin}`);
  }

  // 3. FiveProperties (필수 - 간소화)
  const fiveProps = formatCoreFiveProperties(
    partnerData.fiveProperties ?? partnerData.five_properties,
  );
  if (fiveProps) {
    lines.push(`FiveProperties: ${fiveProps}`);
  }

  // 4. JijiRelations (필수 - 합/충/형/파/해만)
  const relations = formatRelationSummary(
    partnerData.jijiRelations ?? partnerData.jiji_relations,
  );
  if (relations) {
    lines.push(`JijiRelations: ${relations}`);
  }

  // 5. Sinsal (선택 - 간소화)
  const sinsal = formatSinsalSummary(partnerData.sinsal);
  if (sinsal) {
    lines.push(`Sinsal: ${sinsal}`);
  }

  // 6. Daewoon (선택 - 현재/다음만)
  const daewoon = formatRelevantDaewoon(partnerData.daewoon);
  if (daewoon) {
    lines.push(`Daewoon: ${daewoon}`);
  }

  return lines.join("\n");
}

function formatPartnerCompatibilityFlags(value: unknown): string {
  const flags = parseJsonField<Record<string, unknown>>(value);
  if (!flags) return "";
  const parts: string[] = [];
  if (typeof flags.score === "number") parts.push(`score=${flags.score}`);
  if (typeof flags.overall === "string" && flags.overall) {
    parts.push(`overall=${flags.overall}`);
  }
  if (flags.hasHeavenlyStemCombo) parts.push("천간합 있음");
  if (flags.hasDayBranchYukhap) parts.push("일지육합 있음");
  if (flags.hasDayBranchChung) parts.push("일지충 있음");
  if (flags.fiveElementsComplete) parts.push("오행 보완성 있음");
  return parts.join(", ");
}

/**
 * Create bullet style history lines from recent chat messages.
 */
function createHistoryLines(messages: OpenAIMessage[]): string[] {
  if (messages.length <= 1) {
    return [];
  }
  const recent = messages.slice(0, -1).slice(-RECENT_HISTORY_MESSAGE_LIMIT);
  return recent.map((message) => {
    const role = message.role === "assistant" ? "Assistant" : "User";
    const content = message.role === "assistant"
      ? extractAssistantHistoryContext(message.content)
      : truncateMessage(message.content, HISTORY_USER_MAX_CHARS);
    return `- ${role}: ${content}`;
  });
}

/**
 * Summarize expert profile data for inclusion in the prompt.
 */
function createExpertSummary(expertInfo: ExpertInfoRecord | null): string {
  if (!expertInfo || typeof expertInfo !== "object") {
    return "";
  }
  const name = typeof expertInfo.name === "string" ? expertInfo.name : "";
  if (!name) {
    return "";
  }
  const quote =
    typeof expertInfo.expert_quote === "string" && expertInfo.expert_quote
      ? `Quote: ${expertInfo.expert_quote}`
      : "";
  const signature = typeof expertInfo.signature_phrase === "string" &&
      expertInfo.signature_phrase
    ? `Signature: ${expertInfo.signature_phrase}`
    : "";
  return [`Name: ${name}`, quote, signature].filter((item) => item.length > 0)
    .join("\n");
}

function parseJsonField<T>(value: unknown): T | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  if (typeof value === "object") {
    return value as T;
  }
  return null;
}

function buildRoomContext(chatRoom: Record<string, unknown> | null): string {
  const chatContext = typeof chatRoom?.chat_context === "string"
    ? chatRoom.chat_context
    : "general";
  const hasPartner = Boolean(chatRoom?.partner_saju_id);
  const contextLabelMap: Record<string, string> = {
    love_compatibility: "궁합 상담",
    love_personal: "연애 상담",
    career: "직업/진로 상담",
    life: "인생 방향 상담",
    general: "일반 사주 상담",
  };
  const label = contextLabelMap[chatContext] ?? chatContext;

  return [
    `현재 상담 맥락: ${label}`,
    `상대방 정보: ${hasPartner ? "연결됨" : "없음"}`,
  ].join("\n");
}

/**
 * Assemble the user-supplied prompt combining expert, saju, history and question sections.
 */
function buildUserPrompt(params: BuildUserPromptParams): string {
  const sections: string[] = [];
  if (params.expertSummary && params.expertSummary.length > 0) {
    sections.push(`### Expert\n${params.expertSummary}`);
  }
  if (params.roomContext && params.roomContext.length > 0) {
    sections.push(`### Room Context\n${params.roomContext}`);
  }
  // Saju Snapshot은 System Prompt로 이동했으므로 제거
  // sections.push(`### Saju Snapshot\n${params.sajuSummary}`);
  if (params.conversationSummary) {
    sections.push(`### 상담 메모리\n${params.conversationSummary}`);
  }
  if (params.historyLines.length > 0) {
    sections.push(`### Recent Messages\n${params.historyLines.join("\n")}`);
  }
  sections.push(`### Current Question\n${params.currentQuestion}`);
  sections.push(
    `### 답변 기준\n현재 질문을 우선하고, 최근 흐름에 자연스럽게 이어서 답하세요.\n"단점은?", "언제?", "조심할 점은?" 같은 짧은 후속 질문은 Room Context와 직전 주제 기준으로 해석하세요.`,
  );
  return sections.join("\n\n");
}

/**
 * Build a compact Today Fortune summary block for prompt context.
 */
function buildTodayFortuneSummary(
  fortune: Record<string, unknown> | null,
): string {
  if (!fortune || typeof fortune !== "object") {
    return "";
  }
  try {
    const get = (k: string) => (fortune as Record<string, unknown>)[k];
    const score = typeof get("score") === "number" ? String(get("score")) : "";
    const date = typeof get("date") === "string" ? get("date") as string : "";
    const categories = (get("categories") || {}) as Record<
      string,
      { score?: number; description?: string }
    >;
    const interactions = (get("interactions") || {}) as Record<string, unknown>;
    const tenGod = interactions?.tenGod as
      | { label?: string; score?: number }
      | undefined;
    const jiDetails = interactions?.jiDetails as {
      summary?: string;
      score?: number;
    } | undefined;
    const feb = interactions?.fiveElementBalance as {
      todayElement?: string;
      weakest?: string;
      strongest?: string;
    } | undefined;
    const ctx = (get("context") || {}) as Record<string, unknown>;
    const todayGanji = typeof ctx.todayGanji === "string"
      ? ctx.todayGanji as string
      : "";
    const personalDayGanji = typeof ctx.personalDayGanji === "string"
      ? ctx.personalDayGanji as string
      : "";
    const lines: string[] = [];
    if (date) lines.push(`Date: ${date}`);
    if (todayGanji || personalDayGanji) {
      lines.push(`Ganji: today=${todayGanji} / day=${personalDayGanji}`);
    }
    if (score) lines.push(`Score: ${score}`);
    if (tenGod?.label !== undefined) {
      const tgScore = typeof tenGod.score === "number"
        ? `${tenGod.score}`
        : "0";
      lines.push(`TenGod: ${tenGod.label} (${tgScore})`);
    }
    if (jiDetails?.summary) {
      const jScore = typeof jiDetails.score === "number"
        ? `${jiDetails.score}`
        : "0";
      lines.push(`JiDetails: ${jiDetails.summary} (${jScore})`);
    }
    if (feb?.todayElement) {
      const weakest = feb.weakest ?? "";
      const strongest = feb.strongest ?? "";
      lines.push(
        `FiveBalance: today=${feb.todayElement} weak=${weakest} strong=${strongest}`,
      );
    }
    const cat = categories || {};
    const c = (k: string) => {
      const v = cat[k] as { score?: number } | undefined;
      return typeof v?.score === "number" ? String(v.score) : "";
    };
    const catLine = ["career", "love", "wealth", "relationship"]
      .map((k) => `${k}:${c(k)}`)
      .join(", ");
    if (catLine.replace(/[^0-9]/g, "").length > 0) {
      lines.push(`Categories: ${catLine}`);
    }
    return lines.join("\n");
  } catch {
    return "";
  }
}

/**
 * Build a compact New Year Fortune summary block for prompt context.
 */
function buildNewYearFortuneSummary(
  fortune: Record<string, unknown> | null,
): string {
  if (!fortune || typeof fortune !== "object") {
    return "";
  }
  try {
    const get = (k: string) => (fortune as Record<string, unknown>)[k];
    const year = typeof get("year") === "number" ? String(get("year")) : "";
    const yearGanji = get("yearGanji") as {
      yearGanji?: string;
      animal?: string;
      element?: string;
    } | undefined;
    const categories = (get("categories") || {}) as Record<string, string>;
    const luckyMonths = (get("luckyMonths") || []) as Array<
      { month: number; advice: string }
    >;
    const cautiousMonths = (get("cautiousMonths") || []) as Array<
      { month: number; advice: string }
    >;

    const lines: string[] = [];
    if (year) lines.push(`Year: ${year}`);
    if (yearGanji?.yearGanji) {
      const ganjiInfo = [yearGanji.yearGanji];
      if (yearGanji.animal) ganjiInfo.push(yearGanji.animal);
      if (yearGanji.element) ganjiInfo.push(yearGanji.element);
      lines.push(`YearGanji: ${ganjiInfo.join(" ")}`);
    }

    // Categories (해석 텍스트 제외하고 간단히)
    const catParts: string[] = [];
    if (categories.love) catParts.push(`love:${categories.love.slice(0, 50)}`); // 처음 50자만
    if (categories.career) {
      catParts.push(`career:${categories.career.slice(0, 50)}`);
    }
    if (categories.health) {
      catParts.push(`health:${categories.health.slice(0, 50)}`);
    }
    if (categories.wealth) {
      catParts.push(`wealth:${categories.wealth.slice(0, 50)}`);
    }
    if (catParts.length > 0) {
      lines.push(`Categories: ${catParts.join(", ")}`);
    }

    // Lucky Months (최대 2개)
    if (luckyMonths.length > 0) {
      const luckyStr = luckyMonths.slice(0, 2).map((m) =>
        `${m.month}월:${m.advice.slice(0, 80)}`
      ).join(", ");
      lines.push(`LuckyMonths: ${luckyStr}`);
    }

    // Cautious Months (최대 2개)
    if (cautiousMonths.length > 0) {
      const cautiousStr = cautiousMonths.slice(0, 2).map((m) =>
        `${m.month}월:${m.advice.slice(0, 80)}`
      ).join(", ");
      lines.push(`CautiousMonths: ${cautiousStr}`);
    }

    return lines.join("\n");
  } catch {
    return "";
  }
}

/**
 * Get current date in Korean timezone (Asia/Seoul)
 */
function getCurrentKoreanDate(): string {
  const now = new Date();
  // 한국 시간대 (UTC+9)
  const koreanTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  const year = koreanTime.getUTCFullYear();
  const month = String(koreanTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(koreanTime.getUTCDate()).padStart(2, "0");
  return `${year}년 ${month}월 ${day}일`;
}

/**
 * Load base and category-specific system prompts from the config storage.
 */
async function fetchSystemPrompt(
  supabase: SupabaseDatabaseClient,
  expertCategory: string,
  expertId?: string,
): Promise<string> {
  const expertKey = expertId
    ? `${SYSTEM_PROMPT_EXPERT_PREFIX}${expertId}`
    : undefined;
  const targetKeys = [
    SYSTEM_PROMPT_BASE_KEY,
    expertKey,
    `${SYSTEM_PROMPT_CATEGORY_PREFIX}${expertCategory}`,
  ].filter((key): key is string => Boolean(key));
  const { data, error } = await supabase
    .from("config")
    .select("key, value")
    .in("key", targetKeys);
  const currentDate = getCurrentKoreanDate();
  const dateContext =
    `\n\n### 현재 날짜\n현재 날짜는 ${currentDate}입니다. 모든 날짜 관련 답변은 이 날짜를 기준으로 해주세요.`;
  const withCommonGuide = (prompt: string) =>
    `${prompt}${dateContext}\n\n${DECISION_COUNSELING_GUIDE.trim()}`;
  if (error) {
    log("error", "시스템 프롬프트 조회 실패", error);
    return withCommonGuide(FALLBACK_SYSTEM_PROMPT);
  }
  if (!data || data.length === 0) {
    return withCommonGuide(FALLBACK_SYSTEM_PROMPT);
  }
  const records = data as ConfigRow[];
  const base =
    records.find((record) => record.key === SYSTEM_PROMPT_BASE_KEY)?.value ||
    "";
  const expert = expertKey
    ? records.find((record) => record.key === expertKey)?.value || ""
    : "";
  const category =
    records.find((record) =>
      record.key === `${SYSTEM_PROMPT_CATEGORY_PREFIX}${expertCategory}`
    )?.value || "";
  const promptSections = [base, expert, category].filter((section) =>
    section && section.length > 0
  );
  if (promptSections.length === 0) {
    return withCommonGuide(FALLBACK_SYSTEM_PROMPT);
  }
  return withCommonGuide(promptSections.join("\n"));
}

interface ChatStreamRequest {
  roomId: string;
  messages: OpenAIMessage[];
  sajuData: Record<string, unknown>;
  expertCategory: string;
  userMessageId?: string; // 사용자 메시지 ID (무료 대화 추적용)
  partnerSajuId?: string;
}

/**
 * 잔액 체크 및 차감 (무료 대화 우선)
 * @returns { useFreeMessage: boolean, chargeAmount: number | null }
 */
async function checkAndChargeBalance(
  supabase: SupabaseDatabaseClient,
  userId: string,
  roomId: string,
  userMessageId?: string,
): Promise<
  {
    useFreeMessage: boolean;
    chargeAmount: number | null;
    freeMessageRecordId?: string;
  }
> {
  try {
    // 1. 무료 대화 정책 조회
    const { data: policy } = await supabase
      .from("free_message_policy")
      .select("daily_free_count, enabled")
      .limit(1)
      .single();

    const dailyFreeCount = policy?.daily_free_count || 1;
    const freeMessageEnabled = policy?.enabled !== false;

    // 2. 오늘 사용한 무료 대화 수 확인 (한국 시간 기준)
    const today = getKoreanDateString();
    const { data: freeMessages } = await supabase
      .from("free_messages")
      .select("id")
      .eq("user_id", userId)
      .eq("used_date", today);

    const usedFreeCount = freeMessages?.length || 0;
    const canUseFreeMessage = freeMessageEnabled &&
      usedFreeCount < dailyFreeCount;

    // 3. 무료 대화 사용 가능하면 사용
    if (canUseFreeMessage) {
      const { data: freeMessageData, error: freeMessageError } = await supabase
        .from("free_messages")
        .insert({
          user_id: userId,
          used_date: today,
          chat_room_id: roomId,
          user_message_id: userMessageId || null,
        })
        .select("id")
        .single();

      if (freeMessageError) {
        log("error", "무료 대화 기록 실패", freeMessageError);
        // 실패해도 유료로 진행
      } else {
        log("info", "무료 대화 사용", {
          userId,
          roomId,
          usedFreeCount: usedFreeCount + 1,
        });
        return {
          useFreeMessage: true,
          chargeAmount: null,
          freeMessageRecordId: freeMessageData?.id,
        };
      }
    }

    // 4. 무료 대화 불가능하면 잔액 체크
    const { data: balance } = await supabase
      .from("user_balances")
      .select("current_balance")
      .eq("user_id", userId)
      .single();

    const currentBalance = balance?.current_balance || 0;

    if (currentBalance < 1) {
      return { useFreeMessage: false, chargeAmount: null };
    }

    // 5. 잔액 차감 (usages 테이블에 INSERT - Trigger가 자동으로 total_usage 업데이트)
    const { error: usageError } = await supabase
      .from("usages")
      .insert({
        user_id: userId,
        session_id: roomId,
        delta: -1, // 1 사바 차감
        reason: "message",
      });

    if (usageError) {
      log("error", "사바 차감 실패", usageError);
      return { useFreeMessage: false, chargeAmount: null };
    }

    log("info", "사바 차감 완료", {
      userId,
      roomId,
      balanceBefore: currentBalance,
    });
    return {
      useFreeMessage: false,
      chargeAmount: 1,
      freeMessageRecordId: undefined,
    };
  } catch (error) {
    log("error", "잔액 체크 및 차감 실패", error);
    return { useFreeMessage: false, chargeAmount: null };
  }
}

/**
 * 토큰 사용량 업데이트
 */
async function updateTokenUsage(
  supabase: SupabaseDatabaseClient,
  roomId: string,
  usage: OpenAIUsage,
  model: string,
): Promise<void> {
  try {
    const tokenInfo = formatTokenUsage(usage, model);

    // 현재 토큰 사용량 조회
    const { data: currentRoom } = await supabase
      .from("chat_rooms")
      .select(
        "total_prompt_tokens, total_completion_tokens, total_tokens, total_cost_usd",
      )
      .eq("id", roomId)
      .single();

    if (currentRoom) {
      // 누적 업데이트
      const newPromptTokens = (currentRoom.total_prompt_tokens || 0) +
        tokenInfo.promptTokens;
      const newCompletionTokens = (currentRoom.total_completion_tokens || 0) +
        tokenInfo.completionTokens;
      const newTotalTokens = (currentRoom.total_tokens || 0) +
        tokenInfo.totalTokens;
      const newTotalCost = (currentRoom.total_cost_usd || 0) +
        tokenInfo.costUsd;

      await supabase
        .from("chat_rooms")
        .update({
          total_prompt_tokens: newPromptTokens,
          total_completion_tokens: newCompletionTokens,
          total_tokens: newTotalTokens,
          total_cost_usd: newTotalCost,
          last_token_update: new Date().toISOString(),
        })
        .eq("id", roomId);

      log("info", `토큰 사용량 업데이트 완료`, {
        roomId,
        promptTokens: tokenInfo.promptTokens,
        completionTokens: tokenInfo.completionTokens,
        totalTokens: tokenInfo.totalTokens,
        cost: tokenInfo.costUsd,
        totalCost: newTotalCost,
      });
    }
  } catch (error) {
    log("error", "토큰 사용량 업데이트 실패", error);
  }
}

/**
 * 토큰 추적이 포함된 SSE 변환 함수
 */
function transformToSSEWithTokenTracking(
  openaiStream: ReadableStream,
  supabase: SupabaseDatabaseClient,
  roomId: string,
  model: string,
  openaiMessages: OpenAIMessage[],
  currentMessageCount: number,
  onStreamComplete?: (
    assistantResponse: string,
    completedMessageCount: number,
  ) => Promise<void>,
): ReadableStream {
  const reader = openaiStream.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      let buffer = "";
      let responseText = "";
      let finishReason: string | null = null;
      let realUsage: OpenAIUsage | null = null;

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            if (finishReason === "length") {
              log(
                "warn",
                "AI 답변이 토큰 상한에 도달해 중간에 끊겼을 수 있음",
                {
                  roomId,
                  model,
                  responseLength: responseText.length,
                },
              );
            }
            // 스트리밍 완료 후 last_message 갱신 + 토큰 사용량 기록
            const completedMessageCount = currentMessageCount + 1;
            try {
              // 프롬프트 텍스트 길이 계산 (실제 usage를 못 받았을 때의 대체용)
              const promptText = openaiMessages.map((m) => m.content).join(" ");
              const estimatedPromptTokens = Math.ceil(promptText.length / 4);
              const estimatedCompletionTokens = Math.ceil(
                responseText.length / 4,
              );

              const estimatedUsage = {
                prompt_tokens: estimatedPromptTokens,
                completion_tokens: estimatedCompletionTokens,
                total_tokens: estimatedPromptTokens + estimatedCompletionTokens,
              };

              if (realUsage) {
                const cachedTokens =
                  realUsage.prompt_tokens_details?.cached_tokens ?? 0;
                const cacheHitRatioPercent = realUsage.prompt_tokens > 0
                  ? Math.round((cachedTokens / realUsage.prompt_tokens) * 100)
                  : 0;
                log("info", "[캐시 테스트] 실제 usage 수신", {
                  roomId,
                  model,
                  promptTokens: realUsage.prompt_tokens,
                  completionTokens: realUsage.completion_tokens,
                  cachedTokens,
                  cacheWriteTokens: realUsage.cache_write_tokens ?? 0,
                  cacheHitRatioPercent,
                  estimatedPromptTokens, // 실측치와 우리 어림값(길이/4) 비교용
                });
              } else {
                log(
                  "warn",
                  "[캐시 테스트] 실제 usage 못 받음 - 추정치로 대체",
                  { roomId, model },
                );
              }

              await updateTokenUsage(
                supabase,
                roomId,
                realUsage ?? estimatedUsage,
                model,
              );

              // last_message, last_message_at, total_message_count 갱신
              const preview = responseText.length > 40
                ? responseText.slice(0, 40)
                : responseText;
              await supabase
                .from("chat_rooms")
                .update({
                  last_message: preview,
                  last_message_at: new Date().toISOString(),
                  total_message_count: completedMessageCount,
                })
                .eq("id", roomId);
            } catch (estimationError) {
              log("error", "토큰/마지막 메시지 갱신 실패", estimationError);
            }

            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            if (onStreamComplete) {
              Promise.resolve()
                .then(() =>
                  onStreamComplete(responseText, completedMessageCount)
                )
                .catch((summaryError) => {
                  log(
                    "error",
                    "스트리밍 후 상담 메모리 업데이트 실패 (비중요)",
                    summaryError,
                  );
                });
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmedLine = line.trim();

            if (!trimmedLine || trimmedLine === "data: [DONE]") {
              continue;
            }

            if (trimmedLine.startsWith("data: ")) {
              // 응답 청크에서 delta.content 누적 (마지막 메시지 및 completion 토큰 계산용)
              try {
                const jsonData = JSON.parse(trimmedLine.slice(6));
                const piece = jsonData?.choices?.[0]?.delta?.content ??
                  jsonData?.choices?.[0]?.message?.content ??
                  "";
                const nextFinishReason = jsonData?.choices?.[0]
                  ?.finish_reason;
                if (typeof nextFinishReason === "string") {
                  finishReason = nextFinishReason;
                }
                if (piece) {
                  responseText += piece as string;
                }
                // stream_options.include_usage=true일 때 마지막 청크(choices: [])에 usage가 실림
                if (jsonData?.usage) {
                  realUsage = jsonData.usage as OpenAIUsage;
                }
              } catch (_) {
                // Ignore JSON parse errors for keep-alive chunks
              }
              controller.enqueue(encoder.encode(trimmedLine + "\n\n"));
            }
          }
        }
      } catch (error) {
        console.error("Stream transformation error:", error);
        controller.error(error);
      }
    },

    cancel() {
      reader.cancel();
    },
  });
}

/**
 * 대화 요약 생성
 */
async function generateConversationSummary(
  apiKey: string,
  messagesToSummarize: OpenAIMessage[],
  existingSummary: string | null,
): Promise<string> {
  const dialogueText = formatSummaryInputMessages(messagesToSummarize);
  const summaryPrompt = existingSummary
    ? `기존 상담 메모리:
${existingSummary}

새로운 대화를 반영해 상담 메모리를 업데이트해주세요.
메모리는 다음 답변에서 이어 말하기 위한 작은 메모입니다. 추측은 최소화하고, 확실한 정보와 상담 흐름만 짧게 남기세요.
사용자가 실제로 말하지 않은 배경이나 감정은 만들지 마세요. 오래된 내용보다 최근에 해결되지 않은 고민과 다음 행동을 우선하세요.
짧은 후속 질문을 해석할 수 있도록 현재 상담 주제와 직전 초점을 분명히 남기세요.

새로운 대화:
${dialogueText}

다음 형식으로 ${SUMMARY_MAX_CHARS}자 이내로 정리하세요. 해당 내용이 없으면 "없음"이라고 쓰세요:
- 현재 고민:
- 결정 목표:
- 감정 상태:
- 주요 인물/관계:
- 이전 조언:
- 이어갈 포인트:
- 반복 금지:

업데이트된 상담 메모리:`
    : `다음 대화를 바탕으로 상담 메모리를 만들어주세요.
메모리는 다음 답변에서 이어 말하기 위한 작은 메모입니다. 추측은 최소화하고, 확실한 정보와 상담 흐름만 짧게 남기세요.
사용자가 실제로 말하지 않은 배경이나 감정은 만들지 마세요.
짧은 후속 질문을 해석할 수 있도록 현재 상담 주제와 직전 초점을 분명히 남기세요.

대화:
${dialogueText}

다음 형식으로 ${SUMMARY_MAX_CHARS}자 이내로 정리하세요. 해당 내용이 없으면 "없음"이라고 쓰세요:
- 현재 고민:
- 결정 목표:
- 감정 상태:
- 주요 인물/관계:
- 이전 조언:
- 이어갈 포인트:
- 반복 금지:

상담 메모리:`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: AI_CONFIG.SUMMARY_MODEL,
      messages: [{ role: "user", content: summaryPrompt }],
      temperature: AI_CONFIG.SUMMARY_TEMPERATURE,
      max_tokens: AI_CONFIG.SUMMARY_MAX_TOKENS,
    }),
  });

  if (!response.ok) {
    log("error", "요약 생성 실패");
    return existingSummary || "";
  }

  const data = await response.json();
  return clampConversationSummary(data.choices[0].message.content || "");
}

async function updateConversationSummaryAfterStream(
  params: StreamSummaryUpdateParams,
): Promise<void> {
  const {
    apiKey,
    supabase,
    roomId,
    messages,
    assistantResponse,
    existingSummary,
    lastSummaryMessageCount,
    completedMessageCount,
  } = params;

  const messagesSinceLastSummary = completedMessageCount -
    lastSummaryMessageCount;
  const shouldCreateFirstSummary = !existingSummary &&
    completedMessageCount >= 2;
  const shouldRefreshSummary =
    messagesSinceLastSummary >= SUMMARY_UPDATE_INTERVAL_MESSAGES;

  if (!shouldCreateFirstSummary && !shouldRefreshSummary) {
    return;
  }

  const summaryInputMessages = [
    ...messages.slice(-(SUMMARY_INPUT_MESSAGE_LIMIT - 1)),
    {
      role: "assistant" as const,
      content: assistantResponse,
    },
  ];

  if (summaryInputMessages.length === 0 || !assistantResponse.trim()) {
    return;
  }

  log("info", "상담 메모리 업데이트 중", {
    roomId,
    completedMessageCount,
    messagesSinceLastSummary,
    hasExistingSummary: Boolean(existingSummary),
  });

  const newSummary = await generateConversationSummary(
    apiKey,
    summaryInputMessages,
    existingSummary,
  );

  if (!newSummary) {
    return;
  }

  const { error } = await supabase
    .from("chat_rooms")
    .update({
      conversation_summary: newSummary,
      last_summary_message_count: completedMessageCount,
    })
    .eq("id", roomId);

  if (error) {
    log("error", "상담 메모리 저장 실패", error);
    return;
  }

  log("info", "상담 메모리 업데이트 완료", {
    roomId,
    summaryLength: newSummary.length,
    lastSummaryMessageCount: completedMessageCount,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return handleCorsPreFlight();
  }

  try {
    log("info", "Chat streaming request received");

    validateEnvVars([
      "OPENAI_API_KEY",
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
    ]);
    const apiKey = getEnvVar("OPENAI_API_KEY");
    const supabaseUrl = getEnvVar("SUPABASE_URL");
    const supabaseKey = getEnvVar("SUPABASE_SERVICE_ROLE_KEY");

    const body: ChatStreamRequest = await req.json();
    validateRequest(body, ["roomId", "messages", "sajuData", "expertCategory"]);

    const { roomId, messages, sajuData, expertCategory, partnerSajuId } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new StreamingError("대화 메시지가 필요합니다.", 400);
    }

    // Supabase 클라이언트 초기화
    const supabase: SupabaseDatabaseClient = createClient(
      supabaseUrl,
      supabaseKey,
    );

    // Auth 헤더에서 사용자 ID 확인
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(
        token,
      );
      if (!authError && user) {
        userId = user.id;
      }
    }

    if (!userId) {
      throw new StreamingError("사용자 인증이 필요합니다.", 401);
    }

    // 잔액 체크 및 차감 (무료 대화 우선)
    const { useFreeMessage, chargeAmount } = await checkAndChargeBalance(
      supabase,
      userId,
      roomId,
      body.userMessageId,
    );

    if (!useFreeMessage && chargeAmount === null) {
      throw new StreamingError("잔액이 부족합니다.", 402);
    }

    // 1. 채팅방 정보 및 요약 조회
    const { data: chatRoom } = await supabase
      .from("chat_rooms")
      .select(
        "conversation_summary, last_summary_message_count, total_message_count, expert_id, chat_context, partner_saju_id",
      )
      .eq("id", roomId)
      .single();

    // 2. 현재 메시지 수 계산 (DB에서 직접 조회)
    const currentMessageCount = (chatRoom?.total_message_count || 0) + 1; // 지금 보내는 메시지 포함

    // 전문가 정보 조회 (role, tone 등을 위해)
    let expertInfo: ExpertInfoRecord | null = null;
    try {
      // 1순위: 채팅방에 저장된 expert_id로 조회 (개인/궁합 등 세부 전문가 구분용)
      if (chatRoom && (chatRoom as { expert_id?: string }).expert_id) {
        const { data } = await supabase
          .from("experts")
          .select("id, name, expert_quote, signature_phrase, category")
          .eq("id", (chatRoom as { expert_id: string }).expert_id)
          .maybeSingle();
        expertInfo = (data as ExpertInfoRecord) ?? null;
      }
      // fallback: 카테고리로만 조회 (옛 채팅방 등)
      if (!expertInfo) {
        const { data } = await supabase
          .from("experts")
          .select("id, name, expert_quote, signature_phrase, category")
          .eq("category", expertCategory)
          .maybeSingle();
        expertInfo = (data as ExpertInfoRecord) ?? null;
      }
    } catch {
      expertInfo = null;
    }

    // calculated_saju 테이블에서 사주 데이터 조회
    let actualSajuData: Record<string, unknown> = {};
    try {
      // birth_info 조회
      const { data: birthInfo } = await supabase
        .from("birth_info")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (birthInfo) {
        // calculated_saju 조회
        const { data: calculatedSaju } = await supabase
          .from("calculated_saju")
          .select("*")
          .eq("birth_info_id", birthInfo.id)
          .single();

        if (calculatedSaju) {
          // DB 형식을 SajuResult 형식으로 변환
          actualSajuData = {
            yearHangulGanji: calculatedSaju.year_hangul_ganji || "",
            monthHangulGanji: calculatedSaju.month_hangul_ganji || "",
            dayHangulGanji: calculatedSaju.day_hangul_ganji || "",
            timeHangulGanji: calculatedSaju.time_hangul_ganji || "",
            stemSasin: calculatedSaju.stem_sasin || [],
            branchSasin: calculatedSaju.branch_sasin || [],
            sibun: calculatedSaju.sibun || [],
            gongmang: calculatedSaju.gongmang || "",
            fiveProperties: parseJsonField(calculatedSaju.five_properties) ||
              {},
            sinsal: parseJsonField(calculatedSaju.sinsal) || {},
            guin: parseJsonField(calculatedSaju.guin) || {},
            jijiAmjangan: parseJsonField(calculatedSaju.jiji_amjangan) || {},
            jijiRelations: parseJsonField(calculatedSaju.jiji_relations) || {},
            sal: parseJsonField(calculatedSaju.sal) || {},
            daewoon: parseJsonField(calculatedSaju.daewoon) || [],
          };
        } else {
          log("warn", "calculated_saju 데이터를 찾을 수 없습니다", {
            userId,
            birthInfoId: birthInfo.id,
          });
        }
      } else {
        log("warn", "birth_info 데이터를 찾을 수 없습니다", { userId });
      }
    } catch (e) {
      log("error", "calculated_saju 조회 실패", e);
      // 클라이언트에서 전달받은 sajuData를 fallback으로 사용 (하위 호환성)
      const nestedSajuData =
        (sajuData as { saju_data?: Record<string, unknown> }).saju_data;
      actualSajuData = nestedSajuData && typeof nestedSajuData === "object"
        ? nestedSajuData
        : sajuData;
    }

    if (partnerSajuId) {
      const { data: partnerRecord, error: partnerError } = await supabase
        .from("partner_saju")
        .select(
          "partner_name, relationship_status, birth_info, saju_data, compatibility_result, compat_score, compat_overall, compat_has_heavenly_stem_combo, compat_has_day_branch_yukhap, compat_has_day_branch_chung, compat_five_elements_complete, compat_counts",
        )
        .eq("id", partnerSajuId)
        .single();

      if (partnerError) {
        log("warn", "partner_saju 조회 실패", partnerError);
      } else if (partnerRecord) {
        const partnerBirthInfo = parseJsonField<Record<string, unknown>>(
          partnerRecord.birth_info,
        );
        const partnerSajuData = parseJsonField<Record<string, unknown>>(
          partnerRecord.saju_data,
        );
        const compatibilityResult = parseJsonField<Record<string, unknown>>(
          partnerRecord.compatibility_result,
        );

        (actualSajuData as Record<string, unknown>).partnerInfo = {
          name: partnerRecord.partner_name,
          relationshipStatus: partnerRecord.relationship_status,
          birthInfo: partnerBirthInfo,
        };

        if (partnerSajuData) {
          (actualSajuData as Record<string, unknown>).partnerSajuData =
            partnerSajuData;
        }

        if (compatibilityResult) {
          (actualSajuData as Record<string, unknown>).compatibilityResult =
            compatibilityResult;
        }
        // 새 컬럼(비정규화)도 프롬프트 컨텍스트에 제공
        (actualSajuData as Record<string, unknown>).partnerCompatibilityFlags =
          {
            score: partnerRecord.compat_score ?? null,
            overall: partnerRecord.compat_overall ?? null,
            hasHeavenlyStemCombo:
              partnerRecord.compat_has_heavenly_stem_combo ?? false,
            hasDayBranchYukhap: partnerRecord.compat_has_day_branch_yukhap ??
              false,
            hasDayBranchChung: partnerRecord.compat_has_day_branch_chung ??
              false,
            fiveElementsComplete: partnerRecord.compat_five_elements_complete ??
              false,
            counts: partnerRecord.compat_counts ?? null,
          };

        log("debug", "[partner_saju] Partner data attached", {
          partnerSajuId,
          partnerName: partnerRecord.partner_name,
        });
      }
    }

    // 새로운 프롬프트 시스템으로 시스템 프롬프트 생성
    const baseSystemPrompt = await fetchSystemPrompt(
      supabase,
      expertCategory,
      typeof expertInfo?.id === "string" ? expertInfo?.id : undefined,
    );

    // 사주 데이터 요약 생성 및 System Prompt에 추가
    const sajuSummary = buildSajuSummary(actualSajuData);
    const systemPrompt = baseSystemPrompt +
      (sajuSummary && sajuSummary.length > 0
        ? `\n\n### Saju Snapshot\n${sajuSummary}`
        : "");

    log("debug", "[fetchSystemPrompt] System prompt resolved", {
      expertCategory,
      expertId: expertInfo?.id ?? null,
      baseLength: baseSystemPrompt.length,
      sajuLength: sajuSummary.length,
      totalLength: systemPrompt.length,
    });
    const lastQuestion = messages.length > 0
      ? messages[messages.length - 1].content
      : "질문 없음";
    log("debug", "Request payload received", {
      roomId,
      expertCategory,
      partnerSajuId: partnerSajuId ?? null,
    });
    log("debug", "[buildSajuSummary] Saju summary preview", {
      length: sajuSummary.length,
      preview: sajuSummary.slice(0, 200),
    });
    const historyLines = createHistoryLines(messages);
    log("debug", "[createHistoryLines] History lines preview", historyLines);
    const expertSummary = createExpertSummary(
      (expertInfo ?? null) as ExpertInfoRecord | null,
    );
    log("debug", "[createExpertSummary] Expert summary preview", {
      length: expertSummary.length,
      preview: expertSummary.slice(0, 200),
    });

    // 오늘의 운세 카테고리일 때만 daily_fortune 조회
    let todayFortuneSummary = "";
    if (expertCategory === "today_fortune") {
      try {
        const { data: fortuneRow } = await supabase
          .from("saju_analyses")
          .select("daily_fortune")
          .eq("user_id", userId)
          .single();
        const dailyFortune = fortuneRow?.daily_fortune
          ? parseJsonField<Record<string, unknown>>(fortuneRow.daily_fortune)
          : null;
        if (dailyFortune) {
          todayFortuneSummary = buildTodayFortuneSummary(dailyFortune);
        }
      } catch (e) {
        log("warn", "오늘의 운세 컨텍스트 조회 실패(무시 가능)", e);
      }
    }

    // 신년운세 카테고리일 때만 new_year_fortune 조회
    let newYearFortuneSummary = "";
    if (expertCategory === "newyear_fortune") {
      try {
        const { data: fortuneRow } = await supabase
          .from("saju_analyses")
          .select("new_year_fortune")
          .eq("user_id", userId)
          .single();
        const newYearFortune = fortuneRow?.new_year_fortune
          ? parseJsonField<Record<string, unknown>>(fortuneRow.new_year_fortune)
          : null;
        if (newYearFortune) {
          newYearFortuneSummary = buildNewYearFortuneSummary(newYearFortune);
        }
      } catch (e) {
        log("warn", "신년운세 컨텍스트 조회 실패(무시 가능)", e);
      }
    }
    const userPrompt = buildUserPrompt({
      expertSummary,
      sajuSummary: "", // System Prompt로 이동했으므로 빈 문자열 전달
      roomContext: buildRoomContext(
        (chatRoom ?? null) as Record<string, unknown> | null,
      ),
      conversationSummary: chatRoom?.conversation_summary || null,
      historyLines,
      currentQuestion: lastQuestion,
    });

    // 카테고리별로 추가 데이터 조합
    let fullUserPrompt = userPrompt;
    if (
      expertCategory === "today_fortune" && todayFortuneSummary &&
      todayFortuneSummary.length > 0
    ) {
      fullUserPrompt += `\n\n### Today Fortune\n${todayFortuneSummary}`;
    }
    if (
      expertCategory === "newyear_fortune" && newYearFortuneSummary &&
      newYearFortuneSummary.length > 0
    ) {
      fullUserPrompt += `\n\n### New Year Fortune\n${newYearFortuneSummary}`;
    }
    log("debug", "[buildUserPrompt] User prompt assembled", {
      length: fullUserPrompt.length,
      preview: fullUserPrompt.slice(0, 200),
    });

    const openaiMessages: OpenAIMessage[] = [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: fullUserPrompt,
      },
    ];

    const openaiStream = await createOpenAIStream({
      apiKey,
      model: AI_CONFIG.CHAT_MODEL,
      messages: openaiMessages,
      temperature: AI_CONFIG.TEMPERATURE,
      maxTokens: AI_CONFIG.MAX_TOKENS,
      topP: AI_CONFIG.TOP_P,
      frequencyPenalty: AI_CONFIG.FREQUENCY_PENALTY,
      presencePenalty: AI_CONFIG.PRESENCE_PENALTY,
      // 같은 방의 요청이 같은 캐시 서버로 몰리도록 유도 (캐시 히트율 개선 시도)
      promptCacheKey: roomId,
    });

    // 스트리밍 완료 후 토큰 정보 추출을 위한 래퍼
    const sseStream = transformToSSEWithTokenTracking(
      openaiStream,
      supabase,
      roomId,
      AI_CONFIG.CHAT_MODEL,
      openaiMessages,
      currentMessageCount,
      (assistantResponse, completedMessageCount) =>
        updateConversationSummaryAfterStream({
          apiKey,
          supabase,
          roomId,
          messages,
          assistantResponse,
          existingSummary: chatRoom?.conversation_summary || null,
          lastSummaryMessageCount: chatRoom?.last_summary_message_count || 0,
          completedMessageCount,
        }),
    );

    return new Response(sseStream, {
      headers: getStreamingHeaders(),
    });
  } catch (error) {
    log("error", "Error in chat streaming", error);
    return createErrorResponse(error);
  }
});
