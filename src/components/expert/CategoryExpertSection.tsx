/**
 * CategoryExpertSection
 * 
 * 특정 카테고리에 속한 도사들을 표시하는 섹션 컴포넌트
 * 
 * 주요 기능:
 * 1. 카테고리별로 도사를 필터링하여 표시
 * 2. 로딩 상태 처리
 * 3. 빈 상태 처리 (해당 카테고리에 도사가 없을 때)
 * 4. 카테고리 제목과 설명을 SectionHeader로 표시
 * 5. 도사 카드들을 그리드 형태로 배치
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import ExpertCard from './ExpertCard';
import SectionHeader from '../common/SectionHeader';
import { Expert, EXPERT_CATEGORIES } from '../../types/expert';
import { Colors } from '../../constants/colors';
import SabaLoader from '../common/SabaLoader';

interface CategoryExpertSectionProps {
  category: string; // 표시할 카테고리 키 (예: 'comprehensive', 'love')
  experts: Expert[]; // 전체 도사 목록
  loading: boolean; // 로딩 상태
  onExpertPress: (expert: Expert) => void; // 도사 카드 클릭 핸들러
}

const CategoryExpertSection: React.FC<CategoryExpertSectionProps> = ({
  category,
  experts,
  loading,
  onExpertPress,
}) => {
  // 카테고리 정보 가져오기 (제목, 설명 등)
  const categoryInfo = EXPERT_CATEGORIES[category as keyof typeof EXPERT_CATEGORIES];
  
  // 현재 카테고리에 속한 도사들만 필터링
  const filteredExperts = experts.filter(expert => expert.category === category);

  // 로딩 중일 때 - 로딩 인디케이터 표시
  if (loading) {
    return (
      <View style={styles.container}>
        <SectionHeader 
          title={categoryInfo?.label || ''} 
          description={categoryInfo?.description}
          style={styles.header}
        />
        <View style={styles.loadingContainer}>
          <SabaLoader size={64} message="" />
        </View>
      </View>
    );
  }

  // 해당 카테고리에 도사가 없을 때 - 빈 상태 메시지 표시
  if (filteredExperts.length === 0) {
    return (
      <View style={styles.container}>
        <SectionHeader 
          title={categoryInfo?.label || ''} 
          description={categoryInfo?.description}
          style={styles.header}
        />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>해당 카테고리의 도사가 없습니다.</Text>
        </View>
      </View>
    );
  }

  // 정상 상태 - 카테고리 제목과 도사 카드들 표시
  return (
    <View style={styles.container}>
      <SectionHeader 
        title={categoryInfo?.label || ''} 
        description={categoryInfo?.description}
        style={styles.header}
      />
      {/* 도사 카드들을 2열 그리드로 배치 */}
      <View style={styles.cardsGrid}>
        {filteredExperts.map(expert => (
          <ExpertCard
            key={expert.id}
            expert={expert}
            onPress={onExpertPress}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  header: {
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginHorizontal: 3,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default CategoryExpertSection;
