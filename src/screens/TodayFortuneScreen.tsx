import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Colors } from '../constants/colors';
import CustomHeader from '../components/CustomHeader';
import { supabase } from '../utils/supabaseClient';
import { SajuCache } from '../utils/sajuCache';
import { TodayFortuneCache } from '../utils/todayFortuneCache';
import { todayFortuneService, TodayFortuneData } from '../services/ai/todayFortuneService';
import ChatStartBottomSheet from '../components/ChatStartBottomSheet';
import ProgressLoadingCard from '../components/ProgressLoadingCard';
import AIGuideSection from '../components/AIGuideSection';
import BottomFixedButton from '../components/BottomFixedButton';
import { startChatWithExpert } from '../utils/chatUtils';

interface TodayFortuneScreenProps {
  navigation: any;
}

const TodayFortuneScreen: React.FC<TodayFortuneScreenProps> = ({ navigation }) => {
  const [fortuneData, setFortuneData] = useState<TodayFortuneData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);

  const todayDate = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  useEffect(() => {
    loadTodayFortune();
  }, []);

  const loadTodayFortune = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      
      // 1. 캐시에서 먼저 확인
      const cachedFortune = await TodayFortuneCache.getCachedTodayFortune(user.id, today);
      if (cachedFortune) {
        setFortuneData(cachedFortune);
        return;
      }

      // 2. 캐시가 없으면 사주 데이터 가져오기
      const sajuData = await SajuCache.getCachedCalculatedSaju(user.id);
      if (!sajuData) {
        Alert.alert('알림', '사주 정보가 없습니다. 먼저 사주 정보를 입력해주세요.');
        return;
      }

      // 3. 오늘의 운세 생성
      setLoading(true);
      const fortune = await todayFortuneService.generateTodayFortune(user.id, sajuData);
      
      // 4. 캐시에 저장
      await TodayFortuneCache.setCachedTodayFortune(user.id, fortune);
      
      // 5. DB에 저장
      await todayFortuneService.saveTodayFortuneToDatabase(user.id, fortune);
      
      setFortuneData(fortune);
    } catch (error) {
      console.error('오늘의 운세 로드 실패:', error);
      Alert.alert('오류', '오늘의 운세를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = () => {
    setShowChatModal(true);
  };

  const onStartChat = () => {
    setShowChatModal(false);
    startChatWithExpert(navigation, 'today_fortune');
  };

  // 점수에 따른 색상 결정 함수
  const getScoreColor = (score: number) => {
    if (score >= 80) return { color: '#4caf50' }; // 초록색 (매우 좋음)
    if (score >= 60) return { color: '#8bc34a' }; // 연두색 (좋음)
    if (score >= 40) return { color: '#ff9800' }; // 주황색 (보통)
    if (score >= 20) return { color: '#ff5722' }; // 빨간색 (나쁨)
    return { color: '#f44336' }; // 진한 빨간색 (매우 나쁨)
  };

  // 점수에 따른 저울 바 색상 결정 함수
  const getScoreBarColor = (score: number) => {
    if (score >= 80) return '#e8f5e8'; // 연한 초록색
    if (score >= 60) return '#f1f8e9'; // 매우 연한 초록색
    if (score >= 40) return '#fff3e0'; // 연한 주황색
    if (score >= 20) return '#ffebee'; // 연한 빨간색
    return '#ffcdd2'; // 진한 연한 빨간색
  };

  // 점수 검증 및 랜덤 숫자 생성 함수
  const getValidScore = (score: number) => {
    if (score < 0 || score > 100 || isNaN(score)) {
      return Math.floor(Math.random() * 31) + 70; // 70~100 랜덤 숫자
    }
    return score;
  };

  // 점수에 따른 상태 텍스트 결정 함수
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

  // 카테고리별 점수에 따른 표현 결정 함수 (0-100점)
  const getCategoryScoreText = (score: number) => {
    if (score >= 80) return "최고";
    if (score >= 60) return "좋음";
    if (score >= 40) return "보통";
    if (score >= 20) return "주의";
    return "위험";
  };

  const getCategoryScoreColor = (score: number) => {
    if (score >= 80) return { color: '#2e7d32' }; // 진한 초록색
    if (score >= 60) return { color: '#4caf50' }; // 초록색
    if (score >= 40) return { color: '#ff9800' }; // 주황색
    if (score >= 20) return { color: '#f44336' }; // 빨간색
    return { color: '#d32f2f' }; // 진한 빨간색
  };

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
          {/* <SectionHeader 
            title="오늘의 운세" 
            description={"안좋은건 피하고 좋은건 잡으세요"}
          /> */}
          {loading ? (
            <ProgressLoadingCard
            title="AI가 당신의 사주를 분석하고 있어요"
            description="처음 분석만 15초, 다음부터는 즉시 확인 가능해요!"
            duration={15000}
            showProgress={true}
            showIcon={true}
            />
          ) : fortuneData ? (
            <View>
              {/* 운세 점수 섹션 */}
              <View style={styles.scoreSection}>
                <Text style={styles.fortuneTitle}>{todayDate}</Text>
                <Text style={styles.dateSubtext}>오늘의 운세</Text>
                <View style={styles.scoreContainer}>
                  <Text style={[styles.scoreNumber, getScoreColor(fortuneData.score)]}>
                    {getValidScore(fortuneData.score)}
                  </Text>
                  <Text style={[styles.scoreText, getScoreColor(fortuneData.score)]}>점</Text>
                </View>
                <View style={styles.scoreStatusContainer}>
                  <Text style={[styles.scoreStatus, getScoreColor(fortuneData.score)]}>
                    {getScoreStatus(fortuneData.score).main}
                  </Text>
                  <Text style={[styles.scoreStatusSub, getScoreColor(fortuneData.score)]}>
                    {getScoreStatus(fortuneData.score).sub}
                  </Text>
                </View>
                <View style={styles.scoreScale}>
                  <View style={[styles.scaleBar, { backgroundColor: getScoreBarColor(fortuneData.score) }]}>
                    <View style={[styles.scaleIndicator, { left: `${getValidScore(fortuneData.score)}%` }]} />
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
              
              {/* 한 줄 요약 (키 메시지) */}
              <View style={styles.keyMessageCard}>
                <View style={styles.keyMessageHeader}>
                  <Text style={styles.keyMessageLabel}>오늘의 한마디</Text>
                </View>
                <View style={styles.keyMessageContent}>
                  <Text style={styles.keyMessageText}>{fortuneData.summary}</Text>
                </View>
              </View>
              
              {/* 사주 전문적 설명 */}
              <View style={styles.explanationCard}>
                <View style={styles.explanationHeader}>
                  <Text style={styles.explanationLabel}>사주 전문가 해석</Text>
                </View>
                <View style={styles.explanationContent}>
                  <Text style={styles.explanationText}>{fortuneData.explanation}</Text>
                </View>
              </View>
              
              {/* 오늘의 사주 분석 */}
              <View style={styles.sajuAnalysisCard}>
                <View style={styles.sajuAnalysisHeader}>
                  <Text style={styles.sajuAnalysisTitle}>오늘의 사주 분석</Text>
                </View>
                <View style={styles.sajuAnalysisContent}>
                  <View style={styles.analysisItem}>
                    <View style={styles.analysisHeader}>
                      <Text style={styles.analysisLabel}>직업운 /</Text>
                      <Text style={[styles.analysisValue, getCategoryScoreColor(fortuneData.categories?.career?.score || 60)]}>{getCategoryScoreText(fortuneData.categories?.career?.score || 60)}</Text>
                    </View>
                    <Text style={styles.analysisDescription}>{fortuneData.categories?.career?.description || '새로운 프로젝트나 업무에서 좋은 성과를 낼 수 있는 날입니다. 상사와의 관계도 원만해질 것 같아요'}</Text>
                  </View>
                  <View style={styles.analysisItem}>
                    <View style={styles.analysisHeader}>
                      <Text style={styles.analysisLabel}>연애운 /</Text>
                      <Text style={[styles.analysisValue, getCategoryScoreColor(fortuneData.categories?.love?.score || 60)]}>{getCategoryScoreText(fortuneData.categories?.love?.score || 60)}</Text>
                    </View>
                    <Text style={styles.analysisDescription}>{fortuneData.categories?.love?.description || '연인과의 관계가 더 깊어질 수 있는 날입니다. 솔직한 대화를 나누면 관계 발전에 도움이 될 것 같아요'}</Text>
                  </View>
                  <View style={styles.analysisItem}>
                    <View style={styles.analysisHeader}>
                      <Text style={styles.analysisLabel}>인간관계 /</Text>
                      <Text style={[styles.analysisValue, getCategoryScoreColor(fortuneData.categories?.relationship?.score || 60)]}>{getCategoryScoreText(fortuneData.categories?.relationship?.score || 60)}</Text>
                    </View>
                    <Text style={styles.analysisDescription}>{fortuneData.categories?.relationship?.description || '새로운 인연이 생기거나 기존 관계가 더 돈독해질 수 있는 날입니다. 주변 사람들과의 소통을 늘려보세요'}</Text>
                  </View>
                  <View style={styles.analysisItem}>
                    <View style={styles.analysisHeader}>
                      <Text style={styles.analysisLabel}>재물운 /</Text>
                      <Text style={[styles.analysisValue, getCategoryScoreColor(fortuneData.categories?.wealth?.score || 60)]}>{getCategoryScoreText(fortuneData.categories?.wealth?.score || 60)}</Text>
                    </View>
                    <Text style={styles.analysisDescription}>{fortuneData.categories?.wealth?.description || '재정적으로 안정적인 하루가 될 것 같습니다. 불필요한 지출을 피하고 계획적인 소비를 하세요'}</Text>
                  </View>
                </View>
              </View>
              
              {/* 피해야 할 점 (위험/주의 포인트) */}
              <View style={styles.avoidSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>피해야 할 점</Text>
                </View>
                <View style={styles.keywordContainer}>
                  {fortuneData.dontList.map((item, index) => (
                    <View key={index} style={styles.keywordTag}>
                      <Text style={styles.keywordText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
              
              {/* 활용해야 할 점 (강조/활용 포인트) */}
              <View style={styles.utilizeSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>활용해야 할 점</Text>
                </View>
                <View style={styles.keywordContainer}>
                  {fortuneData.doList.map((item, index) => (
                    <View key={index} style={[styles.keywordTag, styles.utilizeTag]}>
                      <Text style={styles.utilizeKeywordText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
              
              {/* AI 가이드 섹션 */}
              <AIGuideSection
                title="더 깊이 있는 이야기가 필요하다면"
                description={`궁금한 점이나 더 자세한 해석이 필요하시다면${'\n'}AI 도사와 1:1 대화를 통해 맞춤형 조언을 받아보세요.`}
                imageSource={require('../../assets/logo/logo_icon.png')}
              />

            </View>
          ) : (
            <View style={styles.noDataContainer}>
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
          )}
        </View>
      </ScrollView>
      
      {/* 하단 고정 버튼 */}
      {fortuneData && (
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
  content: {
    padding: 20,
  },
  scrollContent: {
    paddingBottom: 80, // 하단 고정 버튼 높이만큼 여백 추가
  },
  dateCard: {
    backgroundColor: '#fefefe',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: '#f5f5f5',
    shadowColor: Colors.primaryColor,
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  dateSubtext: {
    fontSize: 14,
    color: '#666',
  },
  fortuneTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  fortuneScore: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 16,
  },
  fortuneDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
  },
  adviceContainer: {
    padding: 16,
  },
  adviceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  adviceText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  detailButton: {
    backgroundColor: Colors.primaryColor,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  detailButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  keyMessageCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginTop: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
  // 사주 전문적 설명 카드 스타일
  explanationCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
    marginLeft:7,
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
  sectionIcon: {
    fontSize: 18,
    marginRight: 8,
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
  explanationContainer: {
    padding: 16,
    marginBottom: 16,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  doContainer: {
    marginBottom: 16,
  },
  dontContainer: {
    marginBottom: 16,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    minHeight: 300,
    paddingTop: 50,
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
  // 새로운 스타일들
  scoreSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical:10,
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
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  explanationIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  adviceSection: {
    marginTop: 8,
  },
  adviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  adviceIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  adviceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  adviceBullet: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
    marginTop: 2,
  },
});

export default TodayFortuneScreen;
