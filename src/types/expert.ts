export interface Expert {
  id: string;
  name: string;
  category: 'comprehensive' | 'love' | 'career' | 'relationship' | 'residence' | 'traditional_saju' | 'today_fortune' | 'newyear_fortune';
  title: string;
  description: string;
  image_name: string;
  is_online: boolean;
  created_at: string;
}

export const EXPERT_CATEGORIES = {
  comprehensive: {
    key: 'comprehensive',
    label: '종합사주',
    description: '전체적인 운세를 종합적으로 분석해드립니다'
  },
  love: {
    key: 'love',
    label: '연애',
    description: '연애운과 애정운을 자세히 봐드립니다'
  },
  career: {
    key: 'career',
    label: '커리어',
    description: '직장운과 사업운을 분석해드립니다'
  },
  relationship: {
    key: 'relationship',
    label: '인간관계',
    description: '인간관계와 가족운을 살펴드립니다'
  },
  residence: {
    key: 'residence',
    label: '금전운',
    description: '재물운과 금전운을 분석해드립니다'
  },
  traditional_saju: {
    key: 'traditional_saju',
    label: '정통사주',
    description: '전통적인 사주 풀이를 제공합니다'
  },
  today_fortune: {
    key: 'today_fortune',
    label: '오늘의 운세',
    description: '오늘 하루의 운세를 알려드립니다'
  },
  newyear_fortune: {
    key: 'newyear_fortune',
    label: '신년 운세',
    description: '새해 운세를 미리 확인해보세요'
  }
} as const;
