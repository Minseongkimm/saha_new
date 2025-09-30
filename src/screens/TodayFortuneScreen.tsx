import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../constants/colors';
import CustomHeader from '../components/CustomHeader';
import ChatStartBottomSheet from '../components/ChatStartBottomSheet';
import AIGuideSection from '../components/AIGuideSection';
import BottomFixedButton from '../components/BottomFixedButton';
import { startChatWithExpert } from '../utils/chatUtils';
import { useTodayFortune } from '../hooks/useTodayFortune';

interface TodayFortuneScreenProps {
  navigation: any;
}

const TodayFortuneScreen: React.FC<TodayFortuneScreenProps> = ({ navigation }) => {
  const [showChatModal, setShowChatModal] = useState(false);

  // 커스텀 훅으로 모든 로직 처리
  const {
    sajuData,
    sajuLoading,
    fortuneData,
    streamingData,
    finalData,
    isStreaming,
  } = useTodayFortune();

  const todayDate = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  const handleStartChat = () => {
    setShowChatModal(true);
  };

  const onStartChat = () => {
    setShowChatModal(false);
    startChatWithExpert(navigation, 'today_fortune');
  };

  // 점수에 따른 색상 결정 함수
  const getScoreColor = (score: number) => {
    if (score >= 80) return { color: '#4caf50' };
    if (score >= 60) return { color: '#8bc34a' };
    if (score >= 40) return { color: '#ff9800' };
    if (score >= 20) return { color: '#ff5722' };
    return { color: '#f44336' };
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return '#e8f5e8';
    if (score >= 60) return '#f1f8e9';
    if (score >= 40) return '#fff3e0';
    if (score >= 20) return '#ffebee';
    return '#ffcdd2';
  };

  const getValidScore = (score: number) => {
    if (score < 0 || score > 100 || isNaN(score)) {
      return Math.floor(Math.random() * 31) + 70;
    }
    return score;
  };

  const getScoreStatus = (score: number) => {
    const validScore = getValidScore(score);
    
    if (validScore >= 100) return { main: '최고의 하루가 되겠네요', sub: '마음껏 즐기세요' };
    if (validScore >= 90) return { main: '매우 좋은 하루가 될 것 같아요', sub: '기대해도 좋습니다' };
    if (validScore >= 80) return { main: '좋은 하루가 되겠네요', sub: '편안하게 지내세요' };
    if (validScore >= 70) return { main: '나쁘지 않은 하루가 될 것 같아요', sub: '안심하고 지내세요' };
    if (validScore >= 60) return { main: '보통의 하루가 되겠네요', sub: '편히 지내세요' };
    if (validScore >= 50) return { main: '조금 조심할 하루가 될 것 같아요', sub: '무리하지 마세요' };
    if (validScore >= 40) return { main: '신중한 하루가 되겠네요', sub: '천천히 지내세요' };
    if (validScore >= 30) return { main: '조심스러운 하루가 될 것 같아요', sub: '조금만 신경 쓰세요' };
    return { main: '주의깊게 지내야 할 하루가 되겠네요', sub: '조심히 지나가세요' };
  };

  const getCategoryScoreText = (score: number) => {
    if (score >= 80) return "최고";
    if (score >= 60) return "좋음";
    if (score >= 40) return "보통";
    if (score >= 20) return "주의";
    return "위험";
  };

  const getCategoryScoreColor = (score: number) => {
    if (score >= 80) return { color: '#2e7d32' };
    if (score >= 60) return { color: '#4caf50' };
    if (score >= 40) return { color: '#ff9800' };
    if (score >= 20) return { color: '#f44336' };
    return { color: '#d32f2f' };
  };

  // 운세 데이터 렌더링 함수
  const renderFortuneContent = (data: any) => (
    <View>
      {/* 운세 점수 섹션 */}
      <View style={styles.scoreSection}>
        <Text style={styles.fortuneTitle}>{todayDate}</Text>
        <Text style={styles.dateSubtext}>오늘의 운세</Text>
        <View style={styles.scoreContainer}>
          <Text style={[styles.scoreNumber, getScoreColor(data.score)]}>
            {getValidScore(data.score)}
          </Text>
          <Text style={[styles.scoreText, getScoreColor(data.score)]}>점</Text>
        </View>
        <View style={styles.scoreStatusContainer}>
          <Text style={[styles.scoreStatus, getScoreColor(data.score)]}>
            {getScoreStatus(data.score).main}
          </Text>
          <Text style={[styles.scoreStatusSub, getScoreColor(data.score)]}>
            {getScoreStatus(data.score).sub}
          </Text>
        </View>
        <View style={styles.scoreScale}>
          <View style={[styles.scaleBar, { backgroundColor: getScoreBarColor(data.score) }]}>
            <View style={[styles.scaleIndicator, { left: `${getValidScore(data.score)}%` }]} />
          </View>
          <View style={styles.scaleLabels}>
            <Text style={styles.scaleLabel}>0</Text>
            <Text style={styles.scaleLabel}>25</Text>
            <Text style={styles.scaleLabel}>50</Text>
            <Text style={styles.scaleLabel}>75</Text>
            <Text style={styles.scaleLabel}>100</Text>
          </View>
        </View>
      </View>
      
      {/* 한 줄 요약 */}
      {data.summary && (
        <View style={styles.keyMessageCard}>
          <View style={styles.keyMessageHeader}>
            <Text style={styles.keyMessageLabel}>오늘의 한마디</Text>
          </View>
          <View style={styles.keyMessageContent}>
            <Text style={styles.keyMessageText}>{data.summary}</Text>
          </View>
        </View>
      )}
      
      {/* 사주 전문적 설명 */}
      {data.explanation && (
        <View style={styles.explanationCard}>
          <View style={styles.explanationHeader}>
            <Text style={styles.explanationLabel}>사주 전문가 해석</Text>
          </View>
          <View style={styles.explanationContent}>
            <Text style={styles.explanationText}>{data.explanation}</Text>
          </View>
        </View>
      )}
      
      {/* 오늘의 사주 분석 */}
      {data.categories && Object.keys(data.categories).length > 0 && (
        <View style={styles.sajuAnalysisCard}>
          <View style={styles.sajuAnalysisHeader}>
            <Text style={styles.sajuAnalysisTitle}>오늘의 사주 분석</Text>
          </View>
          <View style={styles.sajuAnalysisContent}>
            {data.categories.career && data.categories.career.description && (
              <View style={styles.analysisItem}>
                <View style={styles.analysisHeader}>
                  <Text style={styles.analysisLabel}>직업운 /</Text>
                  <Text style={[styles.analysisValue, getCategoryScoreColor(data.categories.career.score)]}>
                    {getCategoryScoreText(data.categories.career.score)}
                  </Text>
                </View>
                <Text style={styles.analysisDescription}>{data.categories.career.description}</Text>
              </View>
            )}
            {data.categories.love && data.categories.love.description && (
              <View style={styles.analysisItem}>
                <View style={styles.analysisHeader}>
                  <Text style={styles.analysisLabel}>연애운 /</Text>
                  <Text style={[styles.analysisValue, getCategoryScoreColor(data.categories.love.score)]}>
                    {getCategoryScoreText(data.categories.love.score)}
                  </Text>
                </View>
                <Text style={styles.analysisDescription}>{data.categories.love.description}</Text>
              </View>
            )}
            {data.categories.relationship && data.categories.relationship.description && (
              <View style={styles.analysisItem}>
                <View style={styles.analysisHeader}>
                  <Text style={styles.analysisLabel}>인간관계 /</Text>
                  <Text style={[styles.analysisValue, getCategoryScoreColor(data.categories.relationship.score)]}>
                    {getCategoryScoreText(data.categories.relationship.score)}
                  </Text>
                </View>
                <Text style={styles.analysisDescription}>{data.categories.relationship.description}</Text>
              </View>
            )}
            {data.categories.wealth && data.categories.wealth.description && (
              <View style={styles.analysisItem}>
                <View style={styles.analysisHeader}>
                  <Text style={styles.analysisLabel}>재물운 /</Text>
                  <Text style={[styles.analysisValue, getCategoryScoreColor(data.categories.wealth.score)]}>
                    {getCategoryScoreText(data.categories.wealth.score)}
                  </Text>
                </View>
                <Text style={styles.analysisDescription}>{data.categories.wealth.description}</Text>
              </View>
            )}
          </View>
        </View>
      )}
      
      {/* 피해야 할 점 */}
      {data.dontList && data.dontList.length > 0 && (
        <View style={styles.avoidSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>피해야 할 점</Text>
          </View>
          <View style={styles.keywordContainer}>
            {data.dontList.map((item: string, index: number) => (
              <View key={index} style={styles.keywordTag}>
                <Text style={styles.keywordText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      
      {/* 활용해야 할 점 */}
      {data.doList && data.doList.length > 0 && (
        <View style={styles.utilizeSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>활용해야 할 점</Text>
          </View>
          <View style={styles.keywordContainer}>
            {data.doList.map((item: string, index: number) => (
              <View key={index} style={[styles.keywordTag, styles.utilizeTag]}>
                <Text style={styles.utilizeKeywordText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      
      {/* AI 가이드 섹션 */}
      <AIGuideSection
        title="더 깊이 있는 이야기가 필요하다면"
        description={`궁금한 점이나 더 자세한 해석이 필요하시다면${'\n'}AI 도사와 1:1 대화를 통해 맞춤형 조언을 받아보세요.`}
        imageSource={require('../../assets/logo/logo_icon.png')}
      />
    </View>
  );

  // === 로딩 UI ===
  
  // 1단계: 사주 데이터 로딩
  if (sajuLoading) {
    return (
      <View style={styles.container}>
        <CustomHeader 
          title="오늘의 운세"
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primaryColor} />
          <Text style={styles.loadingText}>사주 정보를 불러오는 중...</Text>
        </View>
      </View>
    );
  }

  // 2단계: 사주 데이터 없음
  if (!sajuData) {
    return (
      <View style={styles.container}>
        <CustomHeader 
          title="오늘의 운세"
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.centerContainer}>
          <Text style={styles.noDataTitle}>사주 정보가 없습니다</Text>
          <Text style={styles.noDataDescription}>
            오늘의 운세를 확인하려면 먼저 사주 정보를 입력해주세요
          </Text>
          <TouchableOpacity 
            style={styles.inputButton}
            onPress={() => navigation.navigate('SajuInfo')}
          >
            <Text style={styles.inputButtonText}>사주 정보 입력하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 3단계: 스트리밍 또는 최종 데이터 표시
  return (
    <View style={styles.container}>
      <CustomHeader 
        title="오늘의 운세"
        onBackPress={() => navigation.goBack()}
      />
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          {isStreaming && streamingData ? (
            renderFortuneContent(streamingData)
          ) : (fortuneData || finalData) ? (
            renderFortuneContent(fortuneData || finalData)
          ) : (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={Colors.primaryColor} />
              <Text style={styles.loadingText}>오늘의 운세를 확인하는 중...</Text>
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* 하단 고정 버튼 */}
      {(fortuneData || finalData || streamingData) && (
        <BottomFixedButton
          onPress={handleStartChat}
          text="오늘의 운세 이야기 나누기"
        />
      )}
      
      <ChatStartBottomSheet
        visible={showChatModal}
        onClose={() => setShowChatModal(false)}
        onStartChat={onStartChat}
        title="오늘의 운세 전문가와 대화하기"
        description="오늘의 운세에 대해 더 자세히 물어보고 싶은 것이 있나요?"
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    minHeight: 400,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
  content: {
    padding: 20,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  scoreSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 10,
  },
  fortuneTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  dateSubtext: {
    fontSize: 14,
    color: '#666',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 15,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.primaryColor,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.primaryColor,
    marginLeft: 4,
  },
  scoreStatusContainer: {
    marginTop: 0,
    alignItems: 'center',
  },
  scoreStatus: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  scoreStatusSub: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 4,
  },
  scoreScale: {
    width: '100%',
    marginTop: 16,
  },
  scaleBar: {
    height: 8,
    borderRadius: 4,
    position: 'relative',
    backgroundColor: '#f0f0f0',
  },
  scaleIndicator: {
    position: 'absolute',
    top: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#333',
    borderWidth: 2,
    borderColor: '#fff',
    transform: [{ translateX: -8 }],
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  scaleLabel: {
    fontSize: 12,
    color: '#666',
  },
  keyMessageCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginTop: 20,
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
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 28,
  },
  explanationCard: {
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
  explanationHeader: {
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  explanationLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2c3e50',
    textAlign: 'center',
  },
  explanationContent: {
    padding: 20,
  },
  explanationText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    textAlign: 'left',
  },
  sajuAnalysisCard: {
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
  sajuAnalysisHeader: {
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e6f3ff',
  },
  sajuAnalysisTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2c3e50',
    textAlign: 'center',
  },
  sajuAnalysisContent: {
    padding: 20,
  },
  analysisItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  analysisLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  analysisValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 6,
    marginLeft: 7,
  },
  analysisDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  avoidSection: {
    marginBottom: 20,
  },
  utilizeSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
  },
  keywordContainer: {
    flexDirection: 'column',
    gap: 8,
  },
  keywordTag: {
    backgroundColor: '#ffebee',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: 'stretch',
  },
  utilizeTag: {
    backgroundColor: '#e8f5e8',
  },
  keywordText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#d32f2f',
    textAlign: 'left',
  },
  utilizeKeywordText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2e7d32',
    textAlign: 'left',
  },
  noDataTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  noDataDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputButton: {
    backgroundColor: Colors.primaryColor,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  inputButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default TodayFortuneScreen;