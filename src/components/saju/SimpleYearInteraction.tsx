import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { 
  getElementFromStem,
  FiveElementColors,
  FiveElementBackgroundColors
} from '../../constants/fiveElements';

interface SimpleYearInteractionProps {
  myDayGan: string;
  yearGan: string;
  yearName: string;
  year: number;
  sajuData: any;
}

/**
 * 내 일간과 신년의 간단한 상호작용
 */
const SimpleYearInteraction: React.FC<SimpleYearInteractionProps> = ({ 
  myDayGan, 
  yearGan,
  yearName,
  year,
  sajuData
}) => {
  // 오행 추출
  const myElement = getElementFromStem(myDayGan);
  const yearElement = getElementFromStem(yearGan);

  // 오행 색상 키
  const getElementKey = (element: string) => {
    const mapping: { [key: string]: keyof typeof FiveElementColors } = {
      '木': 'wood', '火': 'fire', '土': 'earth', '金': 'metal', '水': 'water'
    };
    return mapping[element] || 'water';
  };

  const myElementKey = getElementKey(myElement);
  const yearElementKey = getElementKey(yearElement);

  // 오행 한글 이름
  const elementNames: { [key: string]: string } = {
    '木': '목', '火': '화', '土': '토', '金': '금', '水': '수'
  };

  // 상호작용 분석
  const analyzeInteraction = () => {
    const sangseong: { [key: string]: string } = {
      '木': '火', '火': '土', '土': '金', '金': '水', '水': '木'
    };
    
    const sangguk: { [key: string]: string } = {
      '木': '土', '土': '水', '水': '火', '火': '金', '金': '木'
    };

    if (myElement === yearElement) {
      return {
        type: '비겁(比劫)',
        description: '같은 오행이 만났습니다',
        detail: '경쟁과 협력이 공존하는 한 해입니다. 비슷한 에너지끼리 만나 때로는 경쟁하고, 때로는 협력하게 됩니다. 주변 사람들과의 관계에서 적절한 거리를 유지하는 것이 중요합니다.',
        relation: '=',
      };
    } else if (sangseong[myElement] === yearElement) {
      return {
        type: '식상(食傷)',
        description: `${elementNames[myElement]}와 ${elementNames[yearElement]}가 생조합니다`,
        detail: '내가 신년을 생조하는 해입니다. \n 발산과 표현의 에너지가 강한 시기로, 자신의 재능을 드러내고 창의적인 활동을 하기 좋습니다. 말이나 글, 예술 등으로 자신을 표현해보세요.',
        relation: '→',
      };
    } else if (sangseong[yearElement] === myElement) {
      return {
        type: '인성(印星)',
        description: `${elementNames[yearElement]}와 ${elementNames[myElement]}가 생조합니다`,
        detail: '신년이 나를 생조하는 해입니다. \n 배움과 성장, 도움을 받는 시기입니다. 스승이나 멘토를 만날 수 있고, 새로운 지식을 습득하기 좋습니다. 겸손한 자세로 배우고 받아들이세요.',
        relation: '←',
      };
    } else if (sangguk[myElement] === yearElement) {
      return {
        type: '재성(財星)',
        description: `${elementNames[myElement]}와 ${elementNames[yearElement]}가 극제합니다`,
        detail: '내가 신년을 극제하는 해입니다. \n 재물과 통제의 에너지가 강한 시기로, 목표를 향해 적극적으로 나아가기 좋습니다. 재물 운도 있으니 투자나 사업 기회를 고려해볼 수 있습니다.',
        relation: '→',
      };
    } else if (sangguk[yearElement] === myElement) {
      return {
        type: '관성(官星)',
        description: `${elementNames[yearElement]}와 ${elementNames[myElement]}가 극제합니다`,
        detail: '신년이 나를 극제하는 해입니다. \n 압박과 시련이 있을 수 있지만, 성장의 기회이기도 합니다. 책임감을 가지고 규칙을 지키며, 어려움을 극복하면 더 강해질 수 있습니다. 무리하지 말고 신중하게 행동하세요.',
        relation: '←',
      };
    }

    return {
      type: '무관계',
      description: '특별한 상호작용이 없습니다',
      detail: '신년과 큰 충돌이나 조화가 없는 평온한 해입니다. 자신의 페이스대로 차근차근 나아가면 됩니다.',
      relation: '—',
    };
  };

  const interaction = analyzeInteraction();

  // 신년 정보 포맷팅
  const formatYearInfo = () => {
    return `${year}년 운세`;
  };

  // 생년월일 정보 포맷팅
  const formatBirthInfo = () => {
    const name = sajuData?.name || '홍길동';
    const birthYear = sajuData?.birthYear || 1990;
    const birthMonth = (sajuData?.birthMonth || 1).toString().padStart(2, '0');
    const birthDay = (sajuData?.birthDay || 1).toString().padStart(2, '0');
    const birthHour = (sajuData?.birthHour || 0).toString().padStart(2, '0');
    const birthMinute = (sajuData?.birthMinute || 0).toString().padStart(2, '0');
    
    return `${name} / ${birthYear}년 ${birthMonth}월 ${birthDay}일 ${birthHour}:${birthMinute} `;
  };

  return (
    <View style={styles.container}>
      {/* 신년 정보 헤더 */}
      <View style={styles.userInfo}>
        <Text style={styles.userBirth}>{formatYearInfo()}</Text>
        <Text style={styles.userBirthInfo}>{formatBirthInfo()}</Text>
      </View>
      
      {/* 메인 비교 카드 */}
      <View style={styles.mainCard}>
        <View style={styles.comparisonRow}>
          {/* 내 일간 */}
          <View style={[styles.ganBox, { backgroundColor: FiveElementBackgroundColors[myElementKey] }]}>
            <Text style={styles.ganLabel}>내 일간</Text>
            <Text style={[styles.ganChar, { color: FiveElementColors[myElementKey] }]}>
              {myDayGan}
            </Text>
            <Text style={[styles.ganElement, { color: FiveElementColors[myElementKey] }]}>{myElement} ({elementNames[myElement]})</Text>
          </View>

          {/* 관계 아이콘 */}
          <View style={styles.relationContainer}>
            <Text style={styles.relationIcon}>{interaction.relation}</Text>
          </View>

          {/* 신년 천간 */}
          <View style={[styles.ganBox, { backgroundColor: FiveElementBackgroundColors[yearElementKey] }]}>
            <Text style={styles.ganLabel}>신년 천간</Text>
            <Text style={[styles.ganChar, { color: FiveElementColors[yearElementKey] }]}>
              {yearGan}
            </Text>
            <Text style={[styles.ganElement, { color: FiveElementColors[yearElementKey] }]}>{yearElement} ({elementNames[yearElement]})</Text>
          </View>
        </View>

        {/* 관계 설명 */}
        <View style={styles.descriptionCard}>
          <View style={styles.descriptionHeader}>
            <Text style={[styles.descriptionTitle, { color: '#333' }]}>
              {interaction.description}
            </Text>
          </View>
          <Text style={styles.descriptionText}>
            {interaction.detail}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fefefe',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 0.3,
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userName: {
    fontSize: 14,
    color: '#666',
  },
  userBirth: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  userBirthInfo: {
    fontSize: 14,
    color: '#666',
  },
  mainCard: {
    backgroundColor: 'white',
    padding: 10,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  ganBox: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  ganLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  ganChar: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 4,
    color: '#333',
  },
  ganElement: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  relationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  relationIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#666',
  },
  descriptionCard: {
    paddingTop: 16,
  },
  descriptionHeader: {
    marginBottom: 8,
  },
  descriptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  descriptionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    textAlign: 'center',
  },
});

export default SimpleYearInteraction;

