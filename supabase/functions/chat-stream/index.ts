/// <reference lib="deno.ns" />

// @deno-types="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/module/index.d.ts"
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { createOpenAIStream } from '../_shared/openai-streaming.ts';
import { handleCorsPreFlight, getStreamingHeaders } from '../_shared/cors.ts';
import { createErrorResponse, validateRequest, validateEnvVars, StreamingError } from '../_shared/error-handler.ts';
import { AI_CONFIG, getEnvVar, log } from '../_shared/config.ts';
import { OpenAIMessage } from '../_shared/types.ts';
import { formatTokenUsage } from '../_shared/token-calculator.ts';

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
}

interface ChatMessageRecord {
  sender_type: string;
  message: string;
}

interface BuildUserPromptParams {
  expertSummary?: string;
  sajuSummary: string;
  conversationSummary?: string | null;
  historyLines: string[];
  currentQuestion: string;
}

const SYSTEM_PROMPT_BASE_KEY = 'chat_system_prompt';
const SYSTEM_PROMPT_CATEGORY_PREFIX = 'chat_system_prompt_';
const SYSTEM_PROMPT_EXPERT_PREFIX = 'chat_system_prompt_expert_';
const FALLBACK_SYSTEM_PROMPT = '당신은 전문 사주 상담가입니다. 제공된 정보를 바탕으로 공감 가면서도 실생활에 도움이 되는 조언을 전달하세요.';

/**
 * Reduce message text length while keeping key intent for history preview.
 */
function truncateMessage(content: string, maxLength: number = 120): string {
  const compact = content.replace(/\s+/g, ' ').trim();
  if (compact.length <= maxLength) {
    return compact;
  }
  return `${compact.slice(0, maxLength - 3)}...`;
}

/**
 * Convert nested keyed records into a compact printable string.
 */
function formatKeyedRecord(value: unknown, maxEntries: number = 5, maxNested: number = 3): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return '';
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .slice(0, maxEntries)
    .map(([key, nested]) => {
      if (Array.isArray(nested)) {
        const items = (nested as unknown[])
          .slice(0, maxNested)
          .map(item => String(item))
          .join('|');
        return `${key}:${items}`;
      }
      if (nested && typeof nested === 'object') {
        const innerEntries = Object.entries(nested as Record<string, unknown>)
          .slice(0, maxNested)
          .map(([innerKey, innerValue]) => `${innerKey}:${String(innerValue)}`)
          .join('|');
        return `${key}:{${innerEntries}}`;
      }
      return `${key}:${String(nested)}`;
    });
  return entries.join(', ');
}

/**
 * Summarize daewoon list entries into ganji only (age removed to avoid calculation errors).
 */
function formatDaewoon(value: unknown, maxEntries: number = 6): string {
  if (!Array.isArray(value)) {
    return '';
  }
  const entries = (value as Array<Record<string, unknown>>)
    .slice(0, maxEntries)
    .map(item => {
      if (!item || typeof item !== 'object') {
        return String(item);
      }
      const record = item as Record<string, unknown>;
      // age는 제거하고 ganji만 사용
      const ganji = record.ganji ? String(record.ganji) : record.year ? String(record.year) : '';
      return ganji;
    })
    .filter(entry => entry.length > 0);
  return entries.join(', ');
}

/**
 * Build the condensed saju context section for the user prompt.
 */
function buildSajuSummary(data: Record<string, unknown>): string {
  const lines: string[] = [];
  const year = typeof data.yearHangulGanji === 'string' ? data.yearHangulGanji : '';
  const month = typeof data.monthHangulGanji === 'string' ? data.monthHangulGanji : '';
  const day = typeof data.dayHangulGanji === 'string' ? data.dayHangulGanji : '';
  const time = typeof data.timeHangulGanji === 'string' ? data.timeHangulGanji : '';
  const pillars = [year, month, day, time].filter(Boolean).join(' ');
  if (pillars) {
    lines.push(`Pillars: ${pillars}`);
  }
  const stemSasin = Array.isArray(data.stemSasin) ? (data.stemSasin as string[]).filter(Boolean).join(', ') : '';
  if (stemSasin) {
    lines.push(`StemSasin: ${stemSasin}`);
  }
  const branchSasin = Array.isArray(data.branchSasin) ? (data.branchSasin as string[]).filter(Boolean).join(', ') : '';
  if (branchSasin) {
    lines.push(`BranchSasin: ${branchSasin}`);
  }
  const sibun = Array.isArray(data.sibun) ? (data.sibun as string[]).filter(Boolean).join(', ') : '';
  if (sibun) {
    lines.push(`Sibun: ${sibun}`);
  }
  const gongmang = typeof data.gongmang === 'string' && data.gongmang ? data.gongmang : '';
  if (gongmang) {
    lines.push(`Gongmang: ${gongmang}`);
  }
  const fiveElements = formatKeyedRecord(data.fiveProperties, 5, 5);
  if (fiveElements) {
    lines.push(`FiveElements: ${fiveElements}`);
  }
  const sinsal = formatKeyedRecord(data.sinsal, 4, 3);
  if (sinsal) {
    lines.push(`Sinsal: ${sinsal}`);
  }
  const guin = formatKeyedRecord(data.guin, 4, 3);
  if (guin) {
    lines.push(`Guin: ${guin}`);
  }
  const relations = formatKeyedRecord(data.jijiRelations, 4, 3);
  if (relations) {
    lines.push(`JijiRelations: ${relations}`);
  }
  const daewoon = formatDaewoon(data.daewoon);
  if (daewoon) {
    lines.push(`Daewoon: ${daewoon}`);
  }
  // 궁합 상담인 경우 상대방 사주 데이터 추가
  const partnerSajuData = (data as Record<string, unknown>)?.partnerSajuData as Record<string, unknown> | undefined;
  if (partnerSajuData && typeof partnerSajuData === 'object') {
    const partnerInfo = (data as Record<string, unknown>)?.partnerInfo as { name?: string } | undefined;
    const partnerName = partnerInfo?.name || '상대방';
    lines.push(`\n### Partner Saju (${partnerName})`);
    const partnerSummary = buildPartnerSajuSummary(partnerSajuData);
    if (partnerSummary && partnerSummary.length > 0) {
      lines.push(partnerSummary);
    }
  }
  
  // 기존 궁합 계산 결과 방식 (주석처리)
  // const flags = (data as Record<string, unknown>)?.partnerCompatibilityFlags as Record<string, unknown> | undefined;
  // if (flags && typeof flags === 'object') {
  //   const hasStem = flags.hasHeavenlyStemCombo ? 'Y' : 'N';
  //   const hasYukhap = flags.hasDayBranchYukhap ? 'Y' : 'N';
  //   const hasChung = flags.hasDayBranchChung ? 'Y' : 'N';
  //   const fiveFull = flags.fiveElementsComplete ? 'Y' : 'N';
  //   lines.push(`CompatFlags: StemCombo=${hasStem}, DayYukhap=${hasYukhap}, DayChung=${hasChung}, FiveFull=${fiveFull}`);
  //   const counts = flags.counts as Record<string, unknown> | undefined;
  //   if (counts && typeof counts === 'object') {
  //     const y = counts.yukhap ?? 0;
  //     const c = counts.chung ?? 0;
  //     const h = counts.hyeong ?? 0;
  //     const p = counts.pa ?? 0;
  //     const e = counts.hae ?? 0;
  //     lines.push(`CompatCounts: yuk=${y}, chung=${c}, hyeong=${h}, pa=${p}, hae=${e}`);
  //   }
  // }
  // const compatResult = (data as Record<string, unknown>)?.compatibilityResult as Record<string, unknown> | undefined;
  // if (compatResult && typeof compatResult === 'object') {
  //   const compatSummary = _buildCompatibilitySummary(compatResult);
  //   if (compatSummary && compatSummary.length > 0) {
  //     lines.push(`\n### Compatibility Analysis\n${compatSummary}`);
  //   }
  // }
  
  return lines.join('\n');
}

/**
 * Build partner saju summary (핵심 정보만 추출)
 */
function buildPartnerSajuSummary(partnerData: Record<string, unknown>): string {
  if (!partnerData || typeof partnerData !== 'object') {
    return '';
  }
  const lines: string[] = [];
  
  // 1. Pillars (필수)
  const year = typeof partnerData.yearHangulGanji === 'string' ? partnerData.yearHangulGanji : '';
  const month = typeof partnerData.monthHangulGanji === 'string' ? partnerData.monthHangulGanji : '';
  const day = typeof partnerData.dayHangulGanji === 'string' ? partnerData.dayHangulGanji : '';
  const time = typeof partnerData.timeHangulGanji === 'string' ? partnerData.timeHangulGanji : '';
  const pillars = [year, month, day, time].filter(Boolean).join(' ');
  if (pillars) {
    lines.push(`Pillars: ${pillars}`);
  }
  
  // 2. StemSasin, BranchSasin (필수)
  const stemSasin = Array.isArray(partnerData.stemSasin) ? (partnerData.stemSasin as string[]).filter(Boolean).join(', ') : '';
  if (stemSasin) {
    lines.push(`StemSasin: ${stemSasin}`);
  }
  const branchSasin = Array.isArray(partnerData.branchSasin) ? (partnerData.branchSasin as string[]).filter(Boolean).join(', ') : '';
  if (branchSasin) {
    lines.push(`BranchSasin: ${branchSasin}`);
  }
  
  // 3. FiveProperties (필수 - 간소화)
  const fiveProps = partnerData.fiveProperties as Record<string, unknown> | undefined;
  if (fiveProps && typeof fiveProps === 'object') {
    const dayProp = typeof fiveProps.dayProperty === 'string' ? fiveProps.dayProperty : '';
    const monthProp = typeof fiveProps.monthProperty === 'string' ? fiveProps.monthProperty : '';
    const yearProp = typeof fiveProps.yearProperty === 'string' ? fiveProps.yearProperty : '';
    const timeProp = typeof fiveProps.timeProperty === 'string' ? fiveProps.timeProperty : '';
    const props = [yearProp, monthProp, dayProp, timeProp].filter(Boolean).join(', ');
    if (props) {
      lines.push(`FiveProperties: ${props}`);
    }
  }
  
  // 4. JijiRelations (필수 - 합/충/형/파/해만)
  const relations = partnerData.jijiRelations as Record<string, unknown[]> | undefined;
  if (relations && typeof relations === 'object') {
    const relationParts: string[] = [];
    if (Array.isArray(relations.육합) && relations.육합.length > 0) {
      relationParts.push(`육합:${relations.육합.join(',')}`);
    }
    if (Array.isArray(relations.삼합) && relations.삼합.length > 0) {
      relationParts.push(`삼합:${relations.삼합.join(',')}`);
    }
    if (Array.isArray(relations.육충) && relations.육충.length > 0) {
      relationParts.push(`육충:${relations.육충.join(',')}`);
    }
    if (Array.isArray(relations.삼형) && relations.삼형.length > 0) {
      relationParts.push(`삼형:${relations.삼형.join(',')}`);
    }
    if (Array.isArray(relations.방합) && relations.방합.length > 0) {
      relationParts.push(`방합:${relations.방합.join(',')}`);
    }
    if (relationParts.length > 0) {
      lines.push(`JijiRelations: ${relationParts.join(', ')}`);
    }
  }
  
  // 5. Sinsal (선택 - 간소화)
  const sinsal = partnerData.sinsal as Record<string, string[]> | undefined;
  if (sinsal && typeof sinsal === 'object') {
    const sinsalList: string[] = [];
    if (Array.isArray(sinsal.yearSinsal)) sinsalList.push(...sinsal.yearSinsal);
    if (Array.isArray(sinsal.monthSinsal)) sinsalList.push(...sinsal.monthSinsal);
    if (Array.isArray(sinsal.daySinsal)) sinsalList.push(...sinsal.daySinsal);
    if (Array.isArray(sinsal.timeSinsal)) sinsalList.push(...sinsal.timeSinsal);
    if (sinsalList.length > 0) {
      lines.push(`Sinsal: ${[...new Set(sinsalList)].join(', ')}`);
    }
  }
  
  // 6. Daewoon (선택 - 최근 3개만)
  const daewoon = formatDaewoon(partnerData.daewoon, 3);
  if (daewoon) {
    lines.push(`Daewoon: ${daewoon}`);
  }
  
  return lines.join('\n');
}

/**
 * Build optimized compatibility analysis summary from compatibility_result JSON.
 * (주석처리 - 더 이상 사용하지 않음, 필요시 주석 해제)
 */
function _buildCompatibilitySummary(compatResult: Record<string, unknown>): string {
  if (!compatResult || typeof compatResult !== 'object') {
    return '';
  }
  const lines: string[] = [];
  
  // 1. Overall
  const overall = typeof compatResult.overall === 'string' ? compatResult.overall : '';
  if (overall) {
    lines.push(`Overall: ${overall}`);
  }
  
  // 2. Categories (description만)
  const categories = compatResult.categories as Record<string, { description?: string }> | undefined;
  if (categories && typeof categories === 'object') {
    const categoryMap: Record<string, string> = {
      dayPillar: 'DayPillar',
      fiveElements: 'FiveElements',
      jijiRelation: 'JijiRelation',
      sinsal: 'Sinsal',
    };
    Object.entries(categories).forEach(([key, value]) => {
      const label = categoryMap[key] || key;
      const desc = value?.description;
      if (desc && typeof desc === 'string') {
        lines.push(`${label}: ${desc}`);
      }
    });
  }
  
  // 3. Insights (dating, marriage, personality만)
  const insights = compatResult.insights as Record<string, string[]> | undefined;
  if (insights && typeof insights === 'object') {
    const insightKeys = ['dating', 'marriage', 'personality'];
    insightKeys.forEach(key => {
      const items = insights[key];
      if (Array.isArray(items) && items.length > 0) {
        const capitalized = key.charAt(0).toUpperCase() + key.slice(1);
        const summary = items.slice(0, 2).join(' / '); // 최대 2개만
        lines.push(`${capitalized}: ${summary}`);
      }
    });
  }
  
  // 4. Cross Summary
  const extras = compatResult.extras as Record<string, unknown> | undefined;
  if (extras && typeof extras === 'object') {
    const cross = extras.cross as Record<string, unknown> | undefined;
    if (cross && typeof cross === 'object') {
      const summary = cross.summary;
      if (summary && typeof summary === 'string') {
        lines.push(`CrossSummary: ${summary}`);
      }
    }
  }
  
  // 5. Timeline (간소화: 최근 2개씩만)
  if (extras && typeof extras === 'object') {
    const timeline = extras.timeline as Record<string, {
      cautions?: Array<{ age?: number; year?: number; ganji?: string; tags?: string[] }>;
      positives?: Array<{ age?: number; year?: number; ganji?: string; tags?: string[] }>;
    }> | undefined;
    if (timeline && typeof timeline === 'object') {
      ['person1', 'person2'].forEach((personKey, idx) => {
        const person = timeline[personKey];
        if (person && typeof person === 'object') {
          const personLabel = `Person${idx + 1}`;
          
          // Cautions (최근 2개, age 기준 정렬)
          if (Array.isArray(person.cautions) && person.cautions.length > 0) {
            const sorted = [...person.cautions]
              .filter(c => c.age !== undefined)
              .sort((a, b) => (a.age || 0) - (b.age || 0))
              .slice(0, 2);
            if (sorted.length > 0) {
              const cautionsStr = sorted.map(c => {
                const age = c.age ?? '';
                const year = c.year ?? '';
                const ganji = c.ganji ?? '';
                const tags = Array.isArray(c.tags) ? c.tags.join(',') : '';
                return `${age}세(${year}년, ${ganji}, ${tags})`;
              }).join(', ');
              lines.push(`Timeline: ${personLabel} Cautions: ${cautionsStr}`);
            }
          }
          
          // Positives (최근 2개, age 기준 정렬)
          if (Array.isArray(person.positives) && person.positives.length > 0) {
            const sorted = [...person.positives]
              .filter(c => c.age !== undefined)
              .sort((a, b) => (a.age || 0) - (b.age || 0))
              .slice(0, 2);
            if (sorted.length > 0) {
              const positivesStr = sorted.map(c => {
                const age = c.age ?? '';
                const year = c.year ?? '';
                const ganji = c.ganji ?? '';
                const tags = Array.isArray(c.tags) ? c.tags.join(',') : '';
                return `${age}세(${year}년, ${ganji}, ${tags})`;
              }).join(', ');
              lines.push(`Timeline: ${personLabel} Positives: ${positivesStr}`);
            }
          }
        }
      });
    }
  }
  
  // 6. Strengths (1-2개만)
  const strengths = compatResult.strengths as string[] | undefined;
  if (Array.isArray(strengths) && strengths.length > 0) {
    const summary = strengths.slice(0, 2).join(' / ');
    lines.push(`Strengths: ${summary}`);
  }
  
  // 7. Weaknesses (1-2개만)
  const weaknesses = compatResult.weaknesses as string[] | undefined;
  if (Array.isArray(weaknesses) && weaknesses.length > 0) {
    const summary = weaknesses.slice(0, 2).join(' / ');
    lines.push(`Weaknesses: ${summary}`);
  }
  
  // 8. Recommendations (1개만)
  const recommendations = compatResult.recommendations as string[] | undefined;
  if (Array.isArray(recommendations) && recommendations.length > 0) {
    lines.push(`Recommendations: ${recommendations[0]}`);
  }
  
  return lines.join('\n');
}

/**
 * Create bullet style history lines from recent chat messages.
 */
function createHistoryLines(messages: OpenAIMessage[]): string[] {
  if (messages.length <= 1) {
    return [];
  }
  const recent = messages.slice(Math.max(messages.length - 4, 0), messages.length - 1);
  return recent.map(message => {
    const role = message.role === 'assistant' ? 'Assistant' : 'User';
    return `- ${role}: ${truncateMessage(message.content)}`;
  });
}

/**
 * Summarize expert profile data for inclusion in the prompt.
 */
function createExpertSummary(expertInfo: ExpertInfoRecord | null): string {
  if (!expertInfo || typeof expertInfo !== 'object') {
    return '';
  }
  const name = typeof expertInfo.name === 'string' ? expertInfo.name : '';
  if (!name) {
    return '';
  }
  const quote = typeof expertInfo.expert_quote === 'string' && expertInfo.expert_quote ? `Quote: ${expertInfo.expert_quote}` : '';
  const signature = typeof expertInfo.signature_phrase === 'string' && expertInfo.signature_phrase ? `Signature: ${expertInfo.signature_phrase}` : '';
  return [ `Name: ${name}`, quote, signature ].filter(item => item.length > 0).join('\n');
}

function parseJsonField<T>(value: unknown): T | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  if (typeof value === 'object') {
    return value as T;
  }
  return null;
}

/**
 * Assemble the user-supplied prompt combining expert, saju, history and question sections.
 */
function buildUserPrompt(params: BuildUserPromptParams): string {
  const sections: string[] = [];
  if (params.expertSummary && params.expertSummary.length > 0) {
    sections.push(`### Expert\n${params.expertSummary}`);
  }
  // Saju Snapshot은 System Prompt로 이동했으므로 제거
  // sections.push(`### Saju Snapshot\n${params.sajuSummary}`);
  if (params.conversationSummary) {
    sections.push(`### Conversation Summary\n${params.conversationSummary}`);
  }
  if (params.historyLines.length > 0) {
    sections.push(`### Recent Messages\n${params.historyLines.join('\n')}`);
  }
  sections.push(`### Current Question\n${params.currentQuestion}`);
  return sections.join('\n\n');
}

/**
 * Build a compact Today Fortune summary block for prompt context.
 */
function buildTodayFortuneSummary(fortune: Record<string, unknown> | null): string {
  if (!fortune || typeof fortune !== 'object') {
    return '';
  }
  try {
    const get = (k: string) => (fortune as Record<string, unknown>)[k];
    const score = typeof get('score') === 'number' ? String(get('score')) : '';
    const date = typeof get('date') === 'string' ? get('date') as string : '';
    const categories = (get('categories') || {}) as Record<string, { score?: number; description?: string }>;
    const interactions = (get('interactions') || {}) as Record<string, unknown>;
    const tenGod = interactions?.['tenGod'] as { label?: string; score?: number } | undefined;
    const jiDetails = interactions?.['jiDetails'] as { summary?: string; score?: number } | undefined;
    const feb = interactions?.['fiveElementBalance'] as { todayElement?: string; weakest?: string; strongest?: string } | undefined;
    const ctx = (get('context') || {}) as Record<string, unknown>;
    const todayGanji = typeof ctx['todayGanji'] === 'string' ? ctx['todayGanji'] as string : '';
    const personalDayGanji = typeof ctx['personalDayGanji'] === 'string' ? ctx['personalDayGanji'] as string : '';
    const lines: string[] = [];
    if (date) lines.push(`Date: ${date}`);
    if (todayGanji || personalDayGanji) lines.push(`Ganji: today=${todayGanji} / day=${personalDayGanji}`);
    if (score) lines.push(`Score: ${score}`);
    if (tenGod?.label !== undefined) {
      const tgScore = typeof tenGod.score === 'number' ? `${tenGod.score}` : '0';
      lines.push(`TenGod: ${tenGod.label} (${tgScore})`);
    }
    if (jiDetails?.summary) {
      const jScore = typeof jiDetails.score === 'number' ? `${jiDetails.score}` : '0';
      lines.push(`JiDetails: ${jiDetails.summary} (${jScore})`);
    }
    if (feb?.todayElement) {
      const weakest = feb.weakest ?? '';
      const strongest = feb.strongest ?? '';
      lines.push(`FiveBalance: today=${feb.todayElement} weak=${weakest} strong=${strongest}`);
    }
    const cat = categories || {};
    const c = (k: string) => {
      const v = cat[k] as { score?: number } | undefined;
      return typeof v?.score === 'number' ? String(v.score) : '';
    };
    const catLine = ['career', 'love', 'wealth', 'relationship']
      .map(k => `${k}:${c(k)}`)
      .join(', ');
    if (catLine.replace(/[^0-9]/g, '').length > 0) {
      lines.push(`Categories: ${catLine}`);
    }
    return lines.join('\n');
  } catch {
    return '';
  }
}

/**
 * Build a compact New Year Fortune summary block for prompt context.
 */
function buildNewYearFortuneSummary(fortune: Record<string, unknown> | null): string {
  if (!fortune || typeof fortune !== 'object') {
    return '';
  }
  try {
    const get = (k: string) => (fortune as Record<string, unknown>)[k];
    const year = typeof get('year') === 'number' ? String(get('year')) : '';
    const yearGanji = get('yearGanji') as { yearGanji?: string; animal?: string; element?: string } | undefined;
    const categories = (get('categories') || {}) as Record<string, string>;
    const luckyMonths = (get('luckyMonths') || []) as Array<{ month: number; advice: string }>;
    const cautiousMonths = (get('cautiousMonths') || []) as Array<{ month: number; advice: string }>;
    
    const lines: string[] = [];
    if (year) lines.push(`Year: ${year}`);
    if (yearGanji?.yearGanji) {
      const ganjiInfo = [yearGanji.yearGanji];
      if (yearGanji.animal) ganjiInfo.push(yearGanji.animal);
      if (yearGanji.element) ganjiInfo.push(yearGanji.element);
      lines.push(`YearGanji: ${ganjiInfo.join(' ')}`);
    }
    
    // Categories (해석 텍스트 제외하고 간단히)
    const catParts: string[] = [];
    if (categories.love) catParts.push(`love:${categories.love.slice(0, 50)}`); // 처음 50자만
    if (categories.career) catParts.push(`career:${categories.career.slice(0, 50)}`);
    if (categories.health) catParts.push(`health:${categories.health.slice(0, 50)}`);
    if (categories.wealth) catParts.push(`wealth:${categories.wealth.slice(0, 50)}`);
    if (catParts.length > 0) {
      lines.push(`Categories: ${catParts.join(', ')}`);
    }
    
    // Lucky Months (최대 2개)
    if (luckyMonths.length > 0) {
      const luckyStr = luckyMonths.slice(0, 2).map(m => `${m.month}월:${m.advice.slice(0, 80)}`).join(', ');
      lines.push(`LuckyMonths: ${luckyStr}`);
    }
    
    // Cautious Months (최대 2개)
    if (cautiousMonths.length > 0) {
      const cautiousStr = cautiousMonths.slice(0, 2).map(m => `${m.month}월:${m.advice.slice(0, 80)}`).join(', ');
      lines.push(`CautiousMonths: ${cautiousStr}`);
    }
    
    return lines.join('\n');
  } catch {
    return '';
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
  const month = String(koreanTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(koreanTime.getUTCDate()).padStart(2, '0');
  return `${year}년 ${month}월 ${day}일`;
}

/**
 * Load base and category-specific system prompts from the config storage.
 */
async function fetchSystemPrompt(
  supabase: SupabaseDatabaseClient,
  expertCategory: string,
  expertId?: string
): Promise<string> {
  const expertKey = expertId ? `${SYSTEM_PROMPT_EXPERT_PREFIX}${expertId}` : undefined;
  const targetKeys = [
    SYSTEM_PROMPT_BASE_KEY,
    expertKey,
    `${SYSTEM_PROMPT_CATEGORY_PREFIX}${expertCategory}`,
  ].filter((key): key is string => Boolean(key));
  const { data, error } = await supabase
    .from('config')
    .select('key, value')
    .in('key', targetKeys);
  if (error) {
    log('error', '시스템 프롬프트 조회 실패', error);
    return FALLBACK_SYSTEM_PROMPT;
  }
  if (!data || data.length === 0) {
    return FALLBACK_SYSTEM_PROMPT;
  }
  const records = data as ConfigRow[];
  const base = records.find(record => record.key === SYSTEM_PROMPT_BASE_KEY)?.value || '';
  const expert = expertKey
    ? records.find(record => record.key === expertKey)?.value || ''
    : '';
  const category = records.find(record => record.key === `${SYSTEM_PROMPT_CATEGORY_PREFIX}${expertCategory}`)?.value || '';
  const promptSections = [base, expert, category].filter(section => section && section.length > 0);
  if (promptSections.length === 0) {
    return FALLBACK_SYSTEM_PROMPT;
  }
  const currentDate = getCurrentKoreanDate();
  const dateContext = `\n\n### 현재 날짜\n현재 날짜는 ${currentDate}입니다. 모든 날짜 관련 답변은 이 날짜를 기준으로 해주세요.`;
  return promptSections.join('\n') + dateContext;
}

interface ChatStreamRequest {
  roomId: string;
  messages: OpenAIMessage[];
  sajuData: Record<string, unknown>;
  expertCategory: string;
  userMessageId?: string;  // 사용자 메시지 ID (무료 대화 추적용)
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
  userMessageId?: string
): Promise<{ useFreeMessage: boolean; chargeAmount: number | null; freeMessageRecordId?: string }> {
  try {
    // 1. 무료 대화 정책 조회
    const { data: policy } = await supabase
      .from('free_message_policy')
      .select('daily_free_count, enabled')
      .limit(1)
      .single();
    
    const dailyFreeCount = policy?.daily_free_count || 1;
    const freeMessageEnabled = policy?.enabled !== false;
    
    // 2. 오늘 사용한 무료 대화 수 확인
    const today = new Date().toISOString().split('T')[0];
    const { data: freeMessages } = await supabase
      .from('free_messages')
      .select('id')
      .eq('user_id', userId)
      .eq('used_date', today);
    
    const usedFreeCount = freeMessages?.length || 0;
    const canUseFreeMessage = freeMessageEnabled && usedFreeCount < dailyFreeCount;
    
    // 3. 무료 대화 사용 가능하면 사용
    if (canUseFreeMessage) {
      const { data: freeMessageData, error: freeMessageError } = await supabase
        .from('free_messages')
        .insert({
          user_id: userId,
          used_date: today,
          chat_room_id: roomId,
          user_message_id: userMessageId || null,
        })
        .select('id')
        .single();
      
      if (freeMessageError) {
        log('error', '무료 대화 기록 실패', freeMessageError);
        // 실패해도 유료로 진행
      } else {
        log('info', '무료 대화 사용', { userId, roomId, usedFreeCount: usedFreeCount + 1 });
        return { 
          useFreeMessage: true, 
          chargeAmount: null,
          freeMessageRecordId: freeMessageData?.id 
        };
      }
    }
    
    // 4. 무료 대화 불가능하면 잔액 체크
    const { data: balance } = await supabase
      .from('user_balances')
      .select('current_balance')
      .eq('user_id', userId)
      .single();
    
    const currentBalance = balance?.current_balance || 0;
    
    if (currentBalance < 1) {
      return { useFreeMessage: false, chargeAmount: null };
    }
    
    // 5. 잔액 차감 (usages 테이블에 INSERT - Trigger가 자동으로 total_usage 업데이트)
    const { error: usageError } = await supabase
      .from('usages')
      .insert({
        user_id: userId,
        session_id: roomId,
        delta: -1, // 1 사바 차감
        reason: 'message',
      });
    
    if (usageError) {
      log('error', '사바 차감 실패', usageError);
      return { useFreeMessage: false, chargeAmount: null };
    }
    
    log('info', '사바 차감 완료', { userId, roomId, balanceBefore: currentBalance });
    return { useFreeMessage: false, chargeAmount: 1, freeMessageRecordId: undefined };
    
  } catch (error) {
    log('error', '잔액 체크 및 차감 실패', error);
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
  model: string
): Promise<void> {
  try {
    const tokenInfo = formatTokenUsage(usage, model);
    
    // 현재 토큰 사용량 조회
    const { data: currentRoom } = await supabase
      .from('chat_rooms')
      .select('total_prompt_tokens, total_completion_tokens, total_tokens, total_cost_usd')
      .eq('id', roomId)
      .single();
    
    if (currentRoom) {
      // 누적 업데이트
      const newPromptTokens = (currentRoom.total_prompt_tokens || 0) + tokenInfo.promptTokens;
      const newCompletionTokens = (currentRoom.total_completion_tokens || 0) + tokenInfo.completionTokens;
      const newTotalTokens = (currentRoom.total_tokens || 0) + tokenInfo.totalTokens;
      const newTotalCost = (currentRoom.total_cost_usd || 0) + tokenInfo.costUsd;
      
      await supabase
        .from('chat_rooms')
        .update({
          total_prompt_tokens: newPromptTokens,
          total_completion_tokens: newCompletionTokens,
          total_tokens: newTotalTokens,
          total_cost_usd: newTotalCost,
          last_token_update: new Date().toISOString()
        })
        .eq('id', roomId);
      
      log('info', `토큰 사용량 업데이트 완료`, {
        roomId,
        promptTokens: tokenInfo.promptTokens,
        completionTokens: tokenInfo.completionTokens,
        totalTokens: tokenInfo.totalTokens,
        cost: tokenInfo.costUsd,
        totalCost: newTotalCost
      });
    }
  } catch (error) {
    log('error', '토큰 사용량 업데이트 실패', error);
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
  currentMessageCount: number
): ReadableStream {
  const reader = openaiStream.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      let buffer = '';
      let responseText = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            // 스트리밍 완료 후 텍스트 길이 기반으로 토큰 추정 및 last_message 갱신
            try {
              // 프롬프트 텍스트 길이 계산
              const promptText = openaiMessages.map(m => m.content).join(' ');
              const estimatedPromptTokens = Math.ceil(promptText.length / 4);
              const estimatedCompletionTokens = Math.ceil(responseText.length / 4);

              const estimatedUsage = {
                prompt_tokens: estimatedPromptTokens,
                completion_tokens: estimatedCompletionTokens,
                total_tokens: estimatedPromptTokens + estimatedCompletionTokens
              };

              await updateTokenUsage(supabase, roomId, estimatedUsage, model);

              // last_message, last_message_at, total_message_count 갱신
              const preview = responseText.length > 40 ? responseText.slice(0, 40) : responseText;
              await supabase
                .from('chat_rooms')
                .update({
                  last_message: preview,
                  last_message_at: new Date().toISOString(),
                  total_message_count: currentMessageCount
                })
                .eq('id', roomId);
            } catch (estimationError) {
              log('error', '토큰/마지막 메시지 갱신 실패', estimationError);
            }
            
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            
            if (!trimmedLine || trimmedLine === 'data: [DONE]') {
              continue;
            }

            if (trimmedLine.startsWith('data: ')) {
              // 응답 청크에서 delta.content 누적 (마지막 메시지 및 completion 토큰 계산용)
              try {
                const jsonData = JSON.parse(trimmedLine.slice(6));
                const piece = jsonData?.choices?.[0]?.delta?.content
                  ?? jsonData?.choices?.[0]?.message?.content
                  ?? '';
                if (piece) {
                  responseText += piece as string;
                }
              } catch (_) {
                // Ignore JSON parse errors for keep-alive chunks
              }
              controller.enqueue(encoder.encode(trimmedLine + '\n\n'));
            }
          }
        }
      } catch (error) {
        console.error('Stream transformation error:', error);
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
  existingSummary: string | null
): Promise<string> {
  const summaryPrompt = existingSummary
    ? `기존 대화 요약: ${existingSummary}

새로운 대화 내용을 분석하여 기존 요약에 추가하거나 업데이트해주세요:

새로운 대화:
${messagesToSummarize.map((m, i) => `${i % 2 === 0 ? '사용자' : 'AI'}: ${m.content}`).join('\n')}

다음 형식으로 요약해주세요:
- 주요 주제: 연애운, 직장운, 건강 등
- 구체적인 조언: 도사가 제시한 방법이나 시기
- 중요한 날짜/시기: 언급된 특정 날짜나 시기
- 사용자 상황: 사용자가 언급한 개인적인 상황

업데이트된 요약:`
    : `다음 대화를 요약해주세요:

대화:
${messagesToSummarize.map((m, i) => `${i % 2 === 0 ? '사용자' : 'AI'}: ${m.content}`).join('\n')}

다음 형식으로 요약해주세요:
- 주요 주제: 연애운, 직장운, 건강 등
- 구체적인 조언: 도사가 제시한 방법이나 시기
- 중요한 날짜/시기: 언급된 특정 날짜나 시기
- 사용자 상황: 사용자가 언급한 개인적인 상황

요약:`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: AI_CONFIG.SUMMARY_MODEL,
      messages: [{ role: 'user', content: summaryPrompt }],
      temperature: AI_CONFIG.SUMMARY_TEMPERATURE,
      max_tokens: AI_CONFIG.SUMMARY_MAX_TOKENS
    }),
  });

  if (!response.ok) {
    log('error', '요약 생성 실패');
    return existingSummary || '';
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight();
  }

  try {
    log('info', 'Chat streaming request received');

    validateEnvVars(['OPENAI_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
    const apiKey = getEnvVar('OPENAI_API_KEY');
    const supabaseUrl = getEnvVar('SUPABASE_URL');
    const supabaseKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

    const body: ChatStreamRequest = await req.json();
    validateRequest(body, ['roomId', 'messages', 'sajuData', 'expertCategory']);

    const { roomId, messages, sajuData, expertCategory, partnerSajuId } = body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new StreamingError('대화 메시지가 필요합니다.', 400);
    }

    // Supabase 클라이언트 초기화
    const supabase: SupabaseDatabaseClient = createClient(supabaseUrl, supabaseKey);
    
    // Auth 헤더에서 사용자 ID 확인
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
      }
    }
    
    if (!userId) {
      throw new StreamingError('사용자 인증이 필요합니다.', 401);
    }

    // 잔액 체크 및 차감 (무료 대화 우선)
    const { useFreeMessage, chargeAmount } = await checkAndChargeBalance(
      supabase,
      userId,
      roomId,
      body.userMessageId
    );
    
    if (!useFreeMessage && chargeAmount === null) {
      throw new StreamingError('잔액이 부족합니다.', 402);
    }

    // 1. 채팅방 정보 및 요약 조회
    const { data: chatRoom } = await supabase
      .from('chat_rooms')
      .select('conversation_summary, last_summary_message_count, total_message_count, expert_id')
      .eq('id', roomId)
      .single();

    // 2. 현재 메시지 수 계산 (DB에서 직접 조회)
    const currentMessageCount = (chatRoom?.total_message_count || 0) + 1; // 지금 보내는 메시지 포함

    // 전문가 정보 조회 (role, tone 등을 위해)
    let expertInfo: ExpertInfoRecord | null = null;
    try {
      // 1순위: 채팅방에 저장된 expert_id로 조회 (개인/궁합 등 세부 전문가 구분용)
      if (chatRoom && (chatRoom as { expert_id?: string }).expert_id) {
        const { data } = await supabase
          .from('experts')
          .select('id, name, expert_quote, signature_phrase, category')
          .eq('id', (chatRoom as { expert_id: string }).expert_id)
          .maybeSingle();
        expertInfo = (data as ExpertInfoRecord) ?? null;
      }
      // fallback: 카테고리로만 조회 (옛 채팅방 등)
      if (!expertInfo) {
        const { data } = await supabase
      .from('experts')
      .select('id, name, expert_quote, signature_phrase, category')
      .eq('category', expertCategory)
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
        .from('birth_info')
        .select('id')
        .eq('user_id', userId)
      .single();

      if (birthInfo) {
        // calculated_saju 조회
        const { data: calculatedSaju } = await supabase
          .from('calculated_saju')
          .select('*')
          .eq('birth_info_id', birthInfo.id)
          .single();

        if (calculatedSaju) {
          // DB 형식을 SajuResult 형식으로 변환
          actualSajuData = {
            yearHangulGanji: calculatedSaju.year_hangul_ganji || '',
            monthHangulGanji: calculatedSaju.month_hangul_ganji || '',
            dayHangulGanji: calculatedSaju.day_hangul_ganji || '',
            timeHangulGanji: calculatedSaju.time_hangul_ganji || '',
            stemSasin: calculatedSaju.stem_sasin || [],
            branchSasin: calculatedSaju.branch_sasin || [],
            sibun: calculatedSaju.sibun || [],
            gongmang: calculatedSaju.gongmang || '',
            fiveProperties: calculatedSaju.five_properties || {},
            sinsal: calculatedSaju.sinsal || {},
            guin: calculatedSaju.guin || {},
            jijiAmjangan: calculatedSaju.jiji_amjangan || {},
            jijiRelations: calculatedSaju.jiji_relations || {},
            sal: calculatedSaju.sal || {},
            daewoon: calculatedSaju.daewoon || [],
          };
        } else {
          log('warn', 'calculated_saju 데이터를 찾을 수 없습니다', { userId, birthInfoId: birthInfo.id });
        }
      } else {
        log('warn', 'birth_info 데이터를 찾을 수 없습니다', { userId });
      }
    } catch (e) {
      log('error', 'calculated_saju 조회 실패', e);
      // 클라이언트에서 전달받은 sajuData를 fallback으로 사용 (하위 호환성)
    const nestedSajuData = (sajuData as { saju_data?: Record<string, unknown> }).saju_data;
      actualSajuData = nestedSajuData && typeof nestedSajuData === 'object'
      ? nestedSajuData
      : sajuData;
    }

    if (expertCategory === 'love' && partnerSajuId) {
      const { data: partnerRecord, error: partnerError } = await supabase
        .from('partner_saju')
        .select('partner_name, relationship_status, birth_info, saju_data, compatibility_result, compat_score, compat_overall, compat_has_heavenly_stem_combo, compat_has_day_branch_yukhap, compat_has_day_branch_chung, compat_five_elements_complete, compat_counts')
        .eq('id', partnerSajuId)
        .single();

      if (partnerError) {
        log('warn', 'partner_saju 조회 실패', partnerError);
      } else if (partnerRecord) {
        const partnerBirthInfo = parseJsonField<Record<string, unknown>>(partnerRecord.birth_info);
        const partnerSajuData = parseJsonField<Record<string, unknown>>(partnerRecord.saju_data);
        const compatibilityResult = parseJsonField<Record<string, unknown>>(partnerRecord.compatibility_result);

        (actualSajuData as Record<string, unknown>).partnerInfo = {
          name: partnerRecord.partner_name,
          relationshipStatus: partnerRecord.relationship_status,
          birthInfo: partnerBirthInfo,
        };

        if (partnerSajuData) {
          (actualSajuData as Record<string, unknown>).partnerSajuData = partnerSajuData;
        }

        if (compatibilityResult) {
          (actualSajuData as Record<string, unknown>).compatibilityResult = compatibilityResult;
        }
        // 새 컬럼(비정규화)도 프롬프트 컨텍스트에 제공
        (actualSajuData as Record<string, unknown>).partnerCompatibilityFlags = {
          score: partnerRecord.compat_score ?? null,
          overall: partnerRecord.compat_overall ?? null,
          hasHeavenlyStemCombo: partnerRecord.compat_has_heavenly_stem_combo ?? false,
          hasDayBranchYukhap: partnerRecord.compat_has_day_branch_yukhap ?? false,
          hasDayBranchChung: partnerRecord.compat_has_day_branch_chung ?? false,
          fiveElementsComplete: partnerRecord.compat_five_elements_complete ?? false,
          counts: partnerRecord.compat_counts ?? null
        };

        log('debug', '[partner_saju] Partner data attached', {
          partnerSajuId,
          partnerName: partnerRecord.partner_name,
        });
      }
    }

    // 새로운 프롬프트 시스템으로 시스템 프롬프트 생성
    const baseSystemPrompt = await fetchSystemPrompt(
      supabase,
      expertCategory,
      typeof expertInfo?.id === 'string' ? expertInfo?.id : undefined
    );
    
    // 사주 데이터 요약 생성 및 System Prompt에 추가
    const sajuSummary = buildSajuSummary(actualSajuData);
    const systemPrompt = baseSystemPrompt + (sajuSummary && sajuSummary.length > 0
      ? `\n\n### Saju Snapshot\n${sajuSummary}`
      : '');
    
    log('debug', '[fetchSystemPrompt] System prompt resolved', {
      expertCategory,
      expertId: expertInfo?.id ?? null,
      baseLength: baseSystemPrompt.length,
      sajuLength: sajuSummary.length,
      totalLength: systemPrompt.length,
    });
    const lastQuestion = messages.length > 0 ? messages[messages.length - 1].content : '질문 없음';
    log('debug', 'Request payload received', {
      roomId,
      expertCategory,
      partnerSajuId: partnerSajuId ?? null,
    });
    log('debug', '[buildSajuSummary] Saju summary preview', { length: sajuSummary.length, preview: sajuSummary.slice(0, 200) });
    const historyLines = createHistoryLines(messages);
    log('debug', '[createHistoryLines] History lines preview', historyLines);
    const expertSummary = createExpertSummary((expertInfo ?? null) as ExpertInfoRecord | null);
    log('debug', '[createExpertSummary] Expert summary preview', { length: expertSummary.length, preview: expertSummary.slice(0, 200) });
    
    // 오늘의 운세 카테고리일 때만 daily_fortune 조회
    let todayFortuneSummary = '';
    if (expertCategory === 'today_fortune') {
      try {
        const { data: fortuneRow } = await supabase
          .from('saju_analyses')
          .select('daily_fortune')
          .eq('user_id', userId)
          .single();
        const dailyFortune = fortuneRow?.daily_fortune ? parseJsonField<Record<string, unknown>>(fortuneRow.daily_fortune) : null;
        if (dailyFortune) {
          todayFortuneSummary = buildTodayFortuneSummary(dailyFortune);
        }
      } catch (e) {
        log('warn', '오늘의 운세 컨텍스트 조회 실패(무시 가능)', e);
      }
    }
    
    // 신년운세 카테고리일 때만 new_year_fortune 조회
    let newYearFortuneSummary = '';
    if (expertCategory === 'newyear_fortune') {
      try {
        const { data: fortuneRow } = await supabase
          .from('saju_analyses')
          .select('new_year_fortune')
          .eq('user_id', userId)
          .single();
        const newYearFortune = fortuneRow?.new_year_fortune ? parseJsonField<Record<string, unknown>>(fortuneRow.new_year_fortune) : null;
        if (newYearFortune) {
          newYearFortuneSummary = buildNewYearFortuneSummary(newYearFortune);
        }
      } catch (e) {
        log('warn', '신년운세 컨텍스트 조회 실패(무시 가능)', e);
      }
    }
    const userPrompt = buildUserPrompt({
      expertSummary,
      sajuSummary: '', // System Prompt로 이동했으므로 빈 문자열 전달
      conversationSummary: chatRoom?.conversation_summary || null,
      historyLines,
      currentQuestion: lastQuestion,
    });
    
    // 카테고리별로 추가 데이터 조합
    let fullUserPrompt = userPrompt;
    if (expertCategory === 'today_fortune' && todayFortuneSummary && todayFortuneSummary.length > 0) {
      fullUserPrompt += `\n\n### Today Fortune\n${todayFortuneSummary}`;
    }
    if (expertCategory === 'newyear_fortune' && newYearFortuneSummary && newYearFortuneSummary.length > 0) {
      fullUserPrompt += `\n\n### New Year Fortune\n${newYearFortuneSummary}`;
    }
    log('debug', '[buildUserPrompt] User prompt assembled', {
      length: (fullUserPrompt).length,
      preview: (fullUserPrompt).slice(0, 200),
    });

    const openaiMessages: OpenAIMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
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
    });
    
    // 스트리밍 완료 후 토큰 정보 추출을 위한 래퍼
    const sseStream = transformToSSEWithTokenTracking(
      openaiStream, 
      supabase, 
      roomId, 
      AI_CONFIG.CHAT_MODEL,
      openaiMessages,
      currentMessageCount
    );

    // 4. 응답 후 요약 업데이트 (백그라운드 처리)
    // 비동기로 처리하여 응답 속도에 영향 없음
    (async () => {
      try {
        const messagesSinceLastSummary = currentMessageCount - (chatRoom?.last_summary_message_count || 0);
        
        // 6개 메시지마다 요약 업데이트
        if (messagesSinceLastSummary >= 6) {
          log('info', `요약 업데이트 중 (마지막 요약 이후 ${messagesSinceLastSummary}개 메시지)`);
          
          // 요약할 메시지 범위: 마지막 요약 이후 ~ 최근 5개 전까지
          const startIndex = chatRoom?.last_summary_message_count || 0;
          const endIndex = Math.max(startIndex, currentMessageCount - 5);
          
          // DB에서 해당 범위의 메시지 조회
          const { data: messagesToSummarize } = await supabase
            .from('chat_messages')
            .select('sender_type, message')
            .eq('chat_room_id', roomId)
            .order('created_at', { ascending: true })
            .range(startIndex, endIndex - 1);
          
          if (messagesToSummarize && messagesToSummarize.length > 0) {
            const messagesToSummarizeFormatted: OpenAIMessage[] = (messagesToSummarize as ChatMessageRecord[]).map(message => ({
              role: message.sender_type === 'user' ? 'user' : 'assistant',
              content: message.message
            }));
            
            // 요약 생성
            const newSummary = await generateConversationSummary(
              apiKey,
              messagesToSummarizeFormatted,
              chatRoom?.conversation_summary || null
            );
            
            // DB 업데이트
            await supabase
              .from('chat_rooms')
              .update({
                conversation_summary: newSummary,
                last_summary_message_count: endIndex
              })
              .eq('id', roomId);
            
            log('info', '요약 업데이트 완료');
          }
        }
      } catch (summaryError) {
        log('error', '요약 업데이트 실패 (비중요)', summaryError);
        // 요약 실패해도 응답은 정상 진행
      }
    })();

    return new Response(sseStream, {
      headers: getStreamingHeaders(),
    });

  } catch (error) {
    log('error', 'Error in chat streaming', error);
    return createErrorResponse(error);
  }
});

