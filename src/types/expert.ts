export type BadgeType = 'popular' | 'new' | 'best';

export interface Expert {
  id: string;
  name: string;
  category: 'comprehensive' | 'love' | 'career' | 'health' | 'money' | 'traditional_saju' | 'today_fortune' | 'newyear_fortune';
  title: string;
  title_mindfulness?: string;
  description: string;
  image_name: string;
  is_online: boolean;
  created_at: string;
  specialty_tags?: string[];
  expert_quote?: string;
  expert_quote_mindfulness?: string;
  signature_phrase?: string;
  signature_phrase_mindfulness?: string;
  badge_type?: BadgeType;
}

export const EXPERT_CATEGORIES = {
  comprehensive: {
    key: 'comprehensive',
    label: '종합',
    labelMindfulness: '종합',
    description: '전체적인 운세를 종합적으로 분석해드립니다',
    descriptionMindfulness: '전체적인 상황을 종합적으로 상담해드립니다'
  },
  love: {
    key: 'love',
    label: '연애',
    labelMindfulness: '관계',
    description: '연애운과 애정운을 자세히 봐드립니다',
    descriptionMindfulness: '관계에 대한 고민을 함께 나누고 상담해드립니다'
  },
  money: {
    key: 'money',
    label: '금전운',
    labelMindfulness: '재정',
    description: '재물운과 금전운을 분석해드립니다',
    descriptionMindfulness: '재정에 대한 고민을 함께 나누고 상담해드립니다'
  },
  career: {
    key: 'career',
    label: '커리어',
    labelMindfulness: '커리어',
    description: '직장운과 사업운을 분석해드립니다',
    descriptionMindfulness: '직장과 사업에 대한 고민을 함께 나누고 상담해드립니다'
  },
  health: {
    key: 'health',
    label: '건강운',
    labelMindfulness: '건강',
    description: '건강운과 질병 시기를 살펴드립니다',
    descriptionMindfulness: '건강에 대한 고민을 함께 나누고 상담해드립니다'
  },
  traditional_saju: {
    key: 'traditional_saju',
    label: '정통사주',
    labelMindfulness: '정통사주',
    description: '전통적인 사주 풀이를 제공합니다',
    descriptionMindfulness: '전통적인 사주 풀이를 제공합니다'
  },
  today_fortune: {
    key: 'today_fortune',
    label: '오늘의 운세',
    labelMindfulness: '오늘의 운세',
    description: '오늘 하루의 운세를 알려드립니다',
    descriptionMindfulness: '오늘 하루에 대해 함께 이야기 나눠보세요'
  },
  newyear_fortune: {
    key: 'newyear_fortune',
    label: '신년 운세',
    labelMindfulness: '신년 운세',
    description: '새해 운세를 미리 확인해보세요',
    descriptionMindfulness: '새해에 대해 함께 이야기 나눠보세요'
  }
} as const;

/**
 * 카테고리 label을 가져오는 함수
 * @param categoryKey - 카테고리 키
 * @param useMindfulnessTerms - mindfulness 문구 사용 여부
 * @returns 카테고리 label
 */
export function getExpertCategoryLabel(
  categoryKey: string,
  useMindfulnessTerms: boolean
): string {
  const category = EXPERT_CATEGORIES[categoryKey as keyof typeof EXPERT_CATEGORIES];
  if (!category) return '';
  return useMindfulnessTerms ? category.labelMindfulness : category.label;
}

/**
 * 카테고리 description을 가져오는 함수
 * @param categoryKey - 카테고리 키
 * @param useMindfulnessTerms - mindfulness 문구 사용 여부
 * @returns 카테고리 description
 */
export function getExpertCategoryDescription(
  categoryKey: string,
  useMindfulnessTerms: boolean
): string {
  const category = EXPERT_CATEGORIES[categoryKey as keyof typeof EXPERT_CATEGORIES];
  if (!category) return '';
  return useMindfulnessTerms ? category.descriptionMindfulness : category.description;
}
