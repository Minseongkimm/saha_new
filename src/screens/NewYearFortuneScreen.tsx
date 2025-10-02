import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Colors } from '../constants/colors';
import SectionHeader from '../components/SectionHeader';
import CustomHeader from '../components/CustomHeader';
import ChatStartBottomSheet from '../components/ChatStartBottomSheet';
import AIGuideSection from '../components/AIGuideSection';
import BottomFixedButton from '../components/BottomFixedButton';
import SimpleYearInteraction from '../components/SimpleYearInteraction';
import { startChatWithExpert } from '../utils/chatUtils';
import { useNewYearFortune } from '../hooks/useNewYearFortune';

interface NewYearFortuneScreenProps {
  navigation: any;
}

const NewYearFortuneScreen: React.FC<NewYearFortuneScreenProps> = ({ navigation }) => {
  const [showChatModal, setShowChatModal] = useState(false);

  // 실제 데이터 훅 사용
  const { 
    fortuneData: displayData, 
    sajuData, 
    loading, 
    sajuLoading, 
    sajuInitializing, 
    error, 
    refetch 
  } = useNewYearFortune(2026);

  const handleStartChat = () => {
    setShowChatModal(true);
  };

  const onStartChat = () => {
    setShowChatModal(false);
    startChatWithExpert(navigation, 'newyear_fortune');
  };

  // 사주 데이터에서 일간 추출
  const parseGanji = (ganjiStr: string) => {
    if (!ganjiStr || ganjiStr.length < 2) return { heavenly: '', earthly: '' };
    
    const heavenlyStems: { [key: string]: string } = {
      '갑': '甲', '을': '乙', '병': '丙', '정': '丁', '무': '戊', 
      '기': '己', '경': '庚', '신': '辛', '임': '壬', '계': '癸'
    };
    
    const heavenly = heavenlyStems[ganjiStr[0]] || '';
    return { heavenly, earthly: '' };
  };

  // displayData null 체크 후에 변수 추출
  const myDayGanji = sajuData?.calculatedSaju?.dayHangulGanji || '';
  const myDayGan = parseGanji(myDayGanji).heavenly;
  const yearGanjiChar = displayData?.yearGanji?.yearGanji || '丙午';
  const yearGan = yearGanjiChar[0];
  const yearJi = yearGanjiChar[1];

  // 카테고리 색상 매핑
  const categoryConfig = {
    overall: { color: '#FF6B6B', label: '전체운' },
    love: { color: '#FF8E8E', label: '연애운' },
    wealth: { color: '#4ECDC4', label: '재물운' },
    health: { color: '#45B7D1', label: '건강운' },
    career: { color: '#96CEB4', label: '직장운' },
  };

  // 로딩 상태 처리
  if (sajuInitializing || sajuLoading || loading) {
    return (
      <View style={styles.container}>
        <CustomHeader 
          title="신년운세"
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primaryColor} />
          <Text style={styles.loadingText}>
            {sajuInitializing ? '사주 데이터를 불러오는 중...' : 
             sajuLoading ? '사주를 계산하는 중...' : 
             '신년운세를 생성하는 중...'}
          </Text>
        </View>
      </View>
    );
  }

  // 에러 상태 처리
  if (error) {
    return (
      <View style={styles.container}>
        <CustomHeader 
          title="신년운세"
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 데이터가 없을 때 처리
  if (!displayData || !sajuData) {
    return (
      <View style={styles.container}>
        <CustomHeader 
          title="신년운세"
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>신년운세 데이터를 불러올 수 없습니다.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="신년운세"
        onBackPress={() => navigation.goBack()}
      />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          <SectionHeader 
            title={`신년운세`}
            description="새해를 맞아 한 해 운세를 미리 확인해보세요"
          />

          {/* 간단한 일간-신년 상호작용 */}
          {myDayGan && yearGan && (
            <SimpleYearInteraction 
              myDayGan={myDayGan}
              yearGan={yearGan}
              yearName={displayData.yearName}
              year={displayData.year}
              sajuData={sajuData}
            />
          )}

          {/* 한 줄 요약 */}
          {displayData.summary && (
            <View style={styles.keyMessageCard}>
              <View style={styles.keyMessageHeader}>
                <Text style={styles.keyMessageLabel}>한 해의 한마디</Text>
              </View>
              <View style={styles.keyMessageContent}>
                <Text style={styles.keyMessageText}>{displayData.summary}</Text>
              </View>
            </View>
          )}

          {/* 전체 운세 */}
          {displayData.overall && (
            <View style={styles.overallCard}>
              <Text style={styles.overallTitle}>한 해 전체 운세</Text>
              <Text style={styles.overallText}>{displayData.overall}</Text>
            </View>
          )}

          {/* 분야별 운세 */}
          {displayData.categories && (
            <View style={styles.fortuneContainer}>
              <Text style={styles.sectionTitle}>분야별 운세</Text>
              
              {/* 연애운 */}
              {displayData.categories.love && (
                <View style={styles.fortuneItem}>
                  <View style={styles.fortuneContent}>
                    <Text style={styles.fortuneCategory}>{categoryConfig.love.label}</Text>
                    <Text style={styles.fortuneDescription}>{displayData.categories.love}</Text>
                  </View>
                </View>
              )}

              {/* 재물운 */}
              {displayData.categories.wealth && (
                <View style={styles.fortuneItem}>
                  <View style={styles.fortuneContent}>
                    <Text style={styles.fortuneCategory}>{categoryConfig.wealth.label}</Text>
                    <Text style={styles.fortuneDescription}>{displayData.categories.wealth}</Text>
                  </View>
                </View>
              )}

              {/* 건강운 */}
              {displayData.categories.health && (
                <View style={styles.fortuneItem}>
                  <View style={styles.fortuneContent}>
                    <Text style={styles.fortuneCategory}>{categoryConfig.health.label}</Text>
                    <Text style={styles.fortuneDescription}>{displayData.categories.health}</Text>
                  </View>
                </View>
              )}

              {/* 직장운 */}
              {displayData.categories.career && (
                <View style={styles.fortuneItem}>
                  <View style={styles.fortuneContent}>
                    <Text style={styles.fortuneCategory}>{categoryConfig.career.label}</Text>
                    <Text style={styles.fortuneDescription}>{displayData.categories.career}</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* 길한 달 */}
          {displayData.luckyMonths && displayData.luckyMonths.length > 0 && (
            <View style={styles.keyPointsCard}>
              <Text style={styles.keyPointsTitle}>길한 달</Text>
              {displayData.luckyMonths.map((item: any, index: number) => (
                <View key={index} style={styles.monthAdviceItem}>
                  <Text style={styles.monthLabel}>{item.month}월</Text>
                  <Text style={styles.monthAdviceText}>{item.advice}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 주의할 달 */}
          {displayData.cautiousMonths && displayData.cautiousMonths.length > 0 && (
            <View style={styles.keyPointsCard}>
              <Text style={styles.keyPointsTitle}>주의할 달</Text>
              {displayData.cautiousMonths.map((item: any, index: number) => (
                <View key={index} style={styles.monthAdviceItem}>
                  <Text style={styles.monthLabel}>{item.month}월</Text>
                  <Text style={styles.monthAdviceText}>{item.advice}</Text>
                </View>
              ))}
            </View>
          )}

          {/* AI 가이드 섹션 */}
          <AIGuideSection
            title="더 깊이 있는 이야기가 필요하다면"
            description={`궁금한 점이나 더 자세한 해석이 필요하시다면${'\n'}AI 도사와 1:1 대화를 통해 맞춤형 조언을 받아보세요.`}
            imageSource={require('../../assets/logo/logo_icon.png')}
          />
        </View>
      </ScrollView>

      {/* 하단 고정 버튼 */}
      <BottomFixedButton
        onPress={handleStartChat}
        text="신년운세 이야기 나누기"
      />

      {/* 채팅 시작 바텀 시트 */}
      <ChatStartBottomSheet
        visible={showChatModal}
        onClose={() => setShowChatModal(false)}
        onStartChat={onStartChat}
        title="신년운세 전문가와 대화하기"
        description="신년운세에 대해 더 자세히 물어보고 싶은 것이 있나요?"
        buttonText="대화 시작하기"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 0,
  },
  yearCard: {
    backgroundColor: 'white',
    paddingHorizontal: 0,
    paddingVertical: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  yearIcon: {
    width: 60,
    height: 60,
    marginBottom: 12,
  },
  yearText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  yearSubtext: {
    fontSize: 16,
    color: Colors.primaryColor,
    fontWeight: '600',
    marginBottom: 8,
  },
  yearDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  keyMessageCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
  },
  keyMessageHeader: {
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e6f3ff',
  },
  keyMessageLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2c3e50',
    textAlign: 'center',
  },
  keyMessageContent: {
    padding: 24,
    alignItems: 'center',
  },
  keyMessageText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 28,
  },
  overallCard: {
    backgroundColor: 'white',
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginBottom: 20,
  },
  overallTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  overallText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  fortuneContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  fortuneItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 0,
    paddingVertical: 16,
    marginBottom: 12,
  },
  fortuneContent: {
    flex: 1,
  },
  fortuneCategory: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  fortuneDescription: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: Colors.primaryColor,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  keyPointsCard: {
    backgroundColor: 'white',
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginBottom: 20,
  },
  keyPointsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  monthAdviceItem: {
    marginBottom: 16,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primaryColor,
    marginBottom: 8,
  },
  monthAdviceText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
});

export default NewYearFortuneScreen;
