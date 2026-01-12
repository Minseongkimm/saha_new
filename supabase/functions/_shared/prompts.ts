/// <reference lib="deno.ns" />

/**
 * Edge Function 프롬프트 (원본 프롬프트 사용)
 */

/**
 * 정통사주 해석용 프롬프트
 */
export function getTraditionalSajuPrompt(sajuData: Record<string, unknown>): string {
  const data = sajuData as {
    name?: string;
    birthInfo?: string;
    yearGanji?: string;
    monthGanji?: string;
    dayGanji?: string;
    timeGanji?: string;
    stemSasin?: string[];
    sibun?: string[];
    fiveProperties?: Record<string, unknown>;
    sinsal?: Record<string, unknown>;
    guin?: Record<string, unknown>;
    gongmang?: string;
    jijiAmjangan?: Record<string, unknown>;
    jijiRelations?: Record<string, unknown>;
  };

  return `당신은 전문 정통사주명리학자입니다. 다음 사주 정보를 바탕으로 상세한 해석을 제공해주세요.

## 사주 정보
- 이름: ${data.name}
- 생년월일시: ${data.birthInfo}
- 사주팔자: ${data.yearGanji} ${data.monthGanji} ${data.dayGanji} ${data.timeGanji}
- 십신: ${data.stemSasin?.join(', ') || '없음'}
- 십이운성: ${data.sibun?.join(', ') || '없음'}
- 오행: ${JSON.stringify(data.fiveProperties) || '없음'}
- 신살: ${JSON.stringify(data.sinsal) || '없음'}
- 귀인: ${JSON.stringify(data.guin) || '없음'}
- 공망: ${data.gongmang || '없음'}
- 지지암장간: ${JSON.stringify(data.jijiAmjangan) || '없음'}
- 지지관계: ${JSON.stringify(data.jijiRelations) || '없음'}

## 해석 요청사항
다음 구조로 상세한 해석을 제공해주세요:

### 1. 전체적인 풀이
- 사주의 전체적인 특징과 성향을 상세히 분석 (4-5문장)
- **일간**의 특성과 **사주팔자**의 조화 관계
- 전반적인 성격과 운명의 흐름
- 인생에서 주목해야 할 핵심 포인트

### 2. 일간 풀이  
- **일간**의 오행 특성과 성격 분석 (3-4문장)
- 강점과 약점을 구체적으로 설명
- 성격 형성에 미치는 요소들

### 3. 오행 균형
- 각 오행의 강약 분석을 구체적으로 설명 (3-4문장)
- **목화토금수** 오행의 균형 상태
- 보완이 필요한 부분과 그 이유
- 오행 불균형이 미치는 영향

### 4. 십성 구조
- 주요 **십신**들의 의미와 영향 (3-4문장)
- 성격과 운세에 미치는 구체적인 영향
- 십신 조화와 갈등 관계

### 5. 신살 해석
- 주요 **신살**들의 의미와 영향 (3-4문장)
- 주의사항과 구체적인 조언
- 신살이 인생에 미치는 영향

### 6. 종합 조언
- 인생 전반에 대한 구체적인 조언과 방향성 (4-5문장)
- 직업, 연애, 건강, 인간관계 등 각 영역별 조언
- 대운과 세운을 고려한 인생 전략

각 섹션은 간결하게, 전체적으로는 800-1000자 내외로 작성해주세요.
구체적인 방안이나 중요한 내용은 **굵게** 처리하세요.

### 전문용어 사용 원칙
- 전문용어는 최소화하고 일상 언어로 설명하세요
- 꼭 필요한 전문용어만 사용하고 쉽게 풀어서 설명해주세요
- 복잡한 개념은 단계별로 쉽게 풀어서 설명하세요
- 일상생활에 비유하여 이해하기 쉽게 전달하세요`;
}

/**
 * 신년운세 프롬프트 생성
 */
export function getNewYearFortunePrompt(
  calculatedResult: Record<string, unknown>,
  sajuData: Record<string, unknown>,
  targetYear: number
): string {
  const result = calculatedResult as {
    interactions?: Record<string, unknown>;
    monthlyFortunes?: Array<{ month: number; interaction: { type: string }; summary: string }>;
    luckyMonths?: number[];
    cautiousMonths?: number[];
    yearGanji?: { yearGanji: [string, string]; element: string; animal: string };
    yearName?: string;
    yearDescription?: string;
  };

  const saju = sajuData as {
    birthYear?: number;
    dayHanjaGanji?: [string, string];
    yearHangulGanji?: string;
    monthHangulGanji?: string;
    dayHangulGanji?: string;
    timeHangulGanji?: string;
  };

  const { interactions, monthlyFortunes, luckyMonths, cautiousMonths, yearGanji, yearName, yearDescription } = result;

  const topLuckyMonths = luckyMonths?.slice(0, 2) || [];
  const luckyMonthDetails = monthlyFortunes
    ?.filter((m) => topLuckyMonths.includes(m.month))
    .map((m) => `${m.month}월(${m.interaction.type}. ${m.summary})`)
    .join('. ') || '';

  const topCautiousMonths = cautiousMonths?.slice(0, 2) || [];
  const cautiousMonthDetails = monthlyFortunes
    ?.filter((m) => topCautiousMonths.includes(m.month))
    .map((m) => `${m.month}월(${m.interaction.type}. ${m.summary})`)
    .join('. ') || '';

  const yearInter = interactions as {
    yearInteraction: { type: string; description: string };
    elementInteraction: { type: string; description: string };
    daewoonInteraction: { type: string; description: string };
    sinsalInteraction: { type: string; description: string };
  };

  return `당신은 전문 사주명리학자입니다. 계산된 신년운세 데이터를 바탕으로 ${targetYear}년 ${yearName} 운세를 해석해주세요.

## 사용자 사주 정보
- 생년월일: ${saju.birthYear || '미상'}년생
- 일간: ${saju.dayHanjaGanji?.[0] || '미상'}
- 일지: ${saju.dayHanjaGanji?.[1] || '미상'}
- 사주팔자: ${saju.yearHangulGanji || ''} ${saju.monthHangulGanji || ''} ${saju.dayHangulGanji || ''} ${saju.timeHangulGanji || ''}

## ${targetYear}년 ${yearName} 정보
- 년간: ${yearGanji?.yearGanji[0]}
- 년지: ${yearGanji?.yearGanji[1]}
- 오행: ${yearGanji?.element}
- 상징: ${yearGanji?.animal}
- 특징: ${yearDescription}

## 상호작용 분석
1. 천간 상호작용: ${yearInter.yearInteraction.type}
   - 설명: ${yearInter.yearInteraction.description}
   
2. 지지 상호작용: ${yearInter.elementInteraction.type}
   - 설명: ${yearInter.elementInteraction.description}
   
3. 대운 조화: ${yearInter.daewoonInteraction.type}
   - 설명: ${yearInter.daewoonInteraction.description}
   
4. 신살/귀인: ${yearInter.sinsalInteraction.type}
   - 설명: ${yearInter.sinsalInteraction.description}

## 월별 특이사항
- 길한 달: ${luckyMonthDetails}
- 조심할 달: ${cautiousMonthDetails}

## 요청사항
위 데이터를 바탕으로 다음을 JSON 형태로 생성해주세요:

**중요: 모든 텍스트에서 쉼표(,)를 사용하지 마세요. 쉼표 대신 마침표(.)나 공백을 사용하세요.**

\`\`\`json
{
  "summary": "한 줄 요약 (20자 이내. 예: '과감하게 도전하는 해')",
  "overall": "전체 운세 해석 (300자 이내). 천간과 지지 상호작용을 중심으로 한 해의 큰 흐름 설명",
  "categories": {
    "love": "연애운 해석 (150자). 상호작용 분석 반영",
    "wealth": "재물운 해석 (150자). 상호작용 분석 반영",
    "health": "건강운 해석 (150자). 상호작용 분석 반영",
    "career": "직장운 해석 (150자). 상호작용 분석 반영"
  },
  "luckyMonths": [
    { "month": ${topLuckyMonths[0]}, "advice": "${topLuckyMonths[0]}월 구체적 조언 (100-150자). 반드시 해당 월의 상호작용 타입 언급" },
    { "month": ${topLuckyMonths[1]}, "advice": "${topLuckyMonths[1]}월 구체적 조언 (100-150자). 반드시 해당 월의 상호작용 타입 언급" }
  ],
  "cautiousMonths": [
    { "month": ${topCautiousMonths[0]}, "advice": "${topCautiousMonths[0]}월 구체적 조언 (100-150자). 반드시 해당 월의 상호작용 타입 언급" },
    { "month": ${topCautiousMonths[1]}, "advice": "${topCautiousMonths[1]}월 구체적 조언 (100-150자). 반드시 해당 월의 상호작용 타입 언급" }
  ]
}
\`\`\`

**주의사항:**
1. 반드시 JSON 형식으로만 응답
2. 쉼표(,) 사용 금지 - 마침표(.)나 공백 사용
3. 상호작용 타입(식상. 인성. 충. 형 등)을 반드시 언급하되, 쉬운 설명 추가
4. 구체적이고 실용적인 조언 제공
5. 구체적인 방안이나 중요한 내용은 **굵게** 처리하세요

### 전문용어 사용 원칙
- 전문용어는 최소화하고 일상 언어로 설명하세요
- 꼭 필요한 전문용어만 사용하고 쉽게 풀어서 설명해주세요
- 복잡한 개념은 단계별로 쉽게 풀어서 설명하세요
- 일상생활에 비유하여 이해하기 쉽게 전달하세요`;
}

/**
 * 오늘의 운세 프롬프트 생성
 */
export function getTodayFortunePrompt(
  calculatedFortune: Record<string, unknown>,
  _sajuData: Record<string, unknown>,
  _todayDate: string
): string {
  const fortune = calculatedFortune as {
    totalScore?: number;
    categoryScores?: {
      career?: number;
      love?: number;
      wealth?: number;
      relationship?: number;
    };
    toneLevels?: {
      overall?: string;
      career?: string;
      love?: string;
      wealth?: string;
      relationship?: string;
    };
    todayGanji?: {
      dayGanji?: string;
    };
    personalSaju?: {
      dayGanji?: string;
      sinsal?: string[];
      guin?: string[] | Record<string, string[]>;
      jijiRelations?: string[];
    };
    interactions?: {
      ganInteraction?: { type?: string; score?: number };
      jiInteraction?: { type?: string; score?: number };
      sinsalInteraction?: { activated?: boolean; score?: number };
      tenGodInteraction?: { label?: string; score?: number };
      detailedJiRelations?: { summary?: string; score?: number };
      fiveElementBalance?: {
        counts?: Record<string, number>;
        todayElement?: string;
        weakest?: string;
        strongest?: string;
        score?: number;
      };
    };
  };

  // guin이 객체인 경우 배열로 변환
  let guinArray: string[] = [];
  if (fortune.personalSaju?.guin) {
    if (Array.isArray(fortune.personalSaju.guin)) {
      guinArray = fortune.personalSaju.guin;
    } else {
      // 객체인 경우 모든 값들을 배열로 변환
      guinArray = Object.values(fortune.personalSaju.guin).flat();
    }
  }

  return `당신은 전문 사주명리학자입니다. 다음 운세 데이터를 분석하여 실용적인 조언을 제공해주세요.

## 1. 운세 점수 및 톤 (ToneLevel)
- 종합: ${fortune.totalScore || 0}점 (${fortune.toneLevels?.overall || 'neutral'})
- 직업: ${fortune.categoryScores?.career || 0}점 (${fortune.toneLevels?.career || 'neutral'})
- 연애: ${fortune.categoryScores?.love || 0}점 (${fortune.toneLevels?.love || 'neutral'})
- 재물: ${fortune.categoryScores?.wealth || 0}점 (${fortune.toneLevels?.wealth || 'neutral'})
- 관계: ${fortune.categoryScores?.relationship || 0}점 (${fortune.toneLevels?.relationship || 'neutral'})

## 2. 사주 분석 데이터
- 간지: 오늘 ${fortune.todayGanji?.dayGanji || ''} vs 본인 ${fortune.personalSaju?.dayGanji || ''}
- 상호작용: 천간 ${fortune.interactions?.ganInteraction?.type || '-'}, 지지 ${fortune.interactions?.jiInteraction?.type || '-'}
- 십신/신살: ${fortune.interactions?.tenGodInteraction?.label || '-'}, ${fortune.interactions?.sinsalInteraction?.activated ? '신살발동' : '-'}
- 활성요소: ${fortune.personalSaju?.sinsal?.join(', ') || ''}, ${guinArray.join(', ') || ''}
- 오행: ${fortune.interactions?.fiveElementBalance?.todayElement || ''}운 (약점: ${fortune.interactions?.fiveElementBalance?.weakest || ''})

## 3. 작성 원칙 (엄수)
1. ToneLevel 일치: 
   - 'bad'/'very_bad': 반드시 경고/주의/보수적 태도로 작성. '무난', '안정', '원만' 등 긍정/중립 어휘 절대 금지.
   - 'good'/'very_good': 기회/성취/적극적 태도로 작성.
2. 구체적 조언: 단순 평가('좋다/나쁘다') 대신 구체적인 행동 지침(Do/Don't)을 제시.
3. 형식 제약: JSON 반환. 쉼표(,) 사용 금지(마침표 사용). 평문 작성. 굵은 글씨 사용 금지.
4. 전문용어 사용: 
   - 전문용어는 최소화하고 일상 언어로 설명하세요
   - 꼭 필요한 전문용어만 사용하고 쉽게 풀어서 설명해주세요
   - 복잡한 개념은 단계별로 쉽게 풀어서 설명하세요
   - 일상생활에 비유하여 이해하기 쉽게 전달하세요

## 4. 응답 형식 (JSON)
\`\`\`json
{
  "summary": "15자 이내 한 줄 요약(예: 과감하게 밀어붙이세요, 오늘은 신중하세요, 스스로를 돌보는 하루 등)",
  "explanation": "종합 운세 설명 3줄 (ToneLevel에 맞춰 작성)",
  "categories": {
    "career": "직업운 조언 3-4줄 (점수와 톤에 맞춰 업무 태도와 전략을 구체적으로 조언)",
    "love": "연애운 조언 3-4줄 (점수와 톤에 맞춰 감정 표현 방식과 대화 태도를 조언)",
    "wealth": "재물운 조언 3-4줄 (점수와 톤에 맞춰 금전 관리와 소비/투자 방향성을 조언)",
    "relationship": "대인관계 조언 3-4줄 (점수와 톤에 맞춰 타인을 대하는 처세술과 행동을 조언)"
  },
  "doList": ["핵심 행동 1 (1줄)", "핵심 행동 2 (1줄)", "핵심 행동 3 (1줄)"],
  "dontList": ["주의 행동 1 (1줄)", "주의 행동 2 (1줄)", "주의 행동 3 (1줄)"]
}
\`\`\``;
}

// chat-prompts.ts 파일이 제거되었으므로 해당 export 제거
