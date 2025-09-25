import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors } from '../constants/colors';
import SectionHeader from '../components/SectionHeader';
import CustomHeader from '../components/CustomHeader';
import { supabase } from '../utils/supabaseClient';
import { SajuCache } from '../utils/sajuCache';
import { TodayFortuneCache } from '../utils/todayFortuneCache';
import { todayFortuneService, TodayFortuneData } from '../services/ai/todayFortuneService';
import ChatStartBottomSheet from '../components/ChatStartBottomSheet';
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

      // 3. 오늘의 운세 생성 (임시 주석)
      setLoading(true);
      // const fortune = await todayFortuneService.generateTodayFortune(user.id, sajuData);
      
      // 4. 캐시에 저장 (임시 주석)
      // await TodayFortuneCache.setCachedTodayFortune(user.id, fortune);
      
      // 5. DB에 저장 (임시 주석)
      // await todayFortuneService.saveTodayFortuneToDatabase(user.id, fortune);
      
      // 임시 더미 데이터
      const dummyFortune = {
        score: 85,
        summary: "과감하게 정진하세요",
        explanation: "오늘은 일간이 강한 날로, 새로운 도전을 시작하기에 좋은 시기입니다. 십이운성과 신살의 조화가 이루어져 긍정적인 에너지가 흐르고 있습니다.",
        doList: [
          "새로운 프로젝트를 시작해보세요",
          "주변 사람들과 소통을 늘려보세요",
          "건강한 식사를 챙기세요",
          "긍정적인 마음가짐을 유지하세요"
        ],
        dontList: [
          "성급한 결정을 피하세요",
          "과도한 스트레스를 받지 마세요",
          "무리한 일정을 잡지 마세요"
        ],
        generatedAt: new Date().toISOString(),
        date: today,
        llmModel: "gpt-4o-mini"
      };
      
      setFortuneData(dummyFortune);
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

  const getScoreStars = (score: number) => {
    const fullStars = Math.floor(score / 20);
    const hasHalfStar = (score % 20) >= 10;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return '★'.repeat(fullStars) + (hasHalfStar ? '☆' : '') + '☆'.repeat(emptyStars);
  };

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="오늘의 운세"
        onBackPress={() => navigation.goBack()}
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <SectionHeader 
            title="오늘의 운세" 
            description={"안좋은건 피하고 좋은건 잡으세요"}
          />

          <View style={styles.dateCard}>
            <Image
              source={require('../../assets/saju/calendar_saju.png')}
              style={styles.calendarIcon}
            />
            <Text style={styles.dateText}>{todayDate}</Text>
            <Text style={styles.dateSubtext}>오늘 하루의 운세</Text>
          </View>


          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primaryColor} />
              <Text style={styles.loadingText}>오늘의 운세를 분석하고 있습니다...</Text>
            </View>
          ) : fortuneData ? (
            <View style={styles.fortuneCard}>
              {/* 운세 점수 섹션 */}
              <View style={styles.scoreSection}>
                <Text style={styles.fortuneTitle}>오늘의 운세</Text>
                <View style={styles.scoreContainer}>
                  <Text style={styles.scoreNumber}>{fortuneData.score}</Text>
                  <Text style={styles.scoreText}>점</Text>
                </View>
                <Text style={styles.fortuneScore}>
                  {getScoreStars(fortuneData.score)}
                </Text>
              </View>
              
              {/* 한마디 요약 */}
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryLabel}>오늘의 한마디</Text>
                <Text style={styles.summaryText}>"{fortuneData.summary}"</Text>
              </View>
              
              {/* 사주 전문가 설명 */}
              <View style={styles.explanationContainer}>
                <View style={styles.explanationHeader}>
                  <Text style={styles.explanationIcon}>🔮</Text>
                  <Text style={styles.explanationTitle}>사주 전문가의 설명</Text>
                </View>
                <Text style={styles.explanationText}>{fortuneData.explanation}</Text>
              </View>
              
              {/* 조언 섹션 */}
              <View style={styles.adviceSection}>
                <View style={styles.doContainer}>
                  <View style={styles.adviceHeader}>
                    <Text style={styles.adviceIcon}>✅</Text>
                    <Text style={styles.adviceTitle}>해야할 것</Text>
                  </View>
                  {fortuneData.doList.map((item, index) => (
                    <View key={index} style={styles.adviceItem}>
                      <Text style={styles.adviceBullet}>•</Text>
                      <Text style={styles.adviceText}>{item}</Text>
                    </View>
                  ))}
                </View>
                
                <View style={styles.dontContainer}>
                  <View style={styles.adviceHeader}>
                    <Text style={styles.adviceIcon}>❌</Text>
                    <Text style={styles.adviceTitle}>하지말아야 할 것</Text>
                  </View>
                  {fortuneData.dontList.map((item, index) => (
                    <View key={index} style={styles.adviceItem}>
                      <Text style={styles.adviceBullet}>•</Text>
                      <Text style={styles.adviceText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
              
              {/* 채팅 버튼 */}
              <TouchableOpacity 
                style={styles.chatButton}
                onPress={handleStartChat}
              >
                <Text style={styles.chatButtonIcon}>💬</Text>
                <Text style={styles.chatButtonText}>
                  오늘의 운세에 대해 더 자세히 물어보기
                </Text>
                <Text style={styles.chatButtonSubtext}>
                  AI 전문가와 1:1 대화하기
                </Text>
              </TouchableOpacity>
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

          <TouchableOpacity 
            style={styles.detailButton}
            onPress={() => navigation.navigate('SajuInfo')}
          >
            <Text style={styles.detailButtonText}>상세 사주 분석 받기</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
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
  calendarIcon: {
    width: 50,
    height: 50,
    marginBottom: 12,
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
  fortuneCard: {
    backgroundColor: '#fefefe',
    borderRadius: 16,
    padding: 24,
    marginBottom: 30,
    borderWidth: 0.5,
    borderColor: '#f5f5f5',
    shadowColor: Colors.primaryColor,
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
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
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
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
  loadingContainer: {
    backgroundColor: '#fefefe',
    borderRadius: 16,
    padding: 40,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: '#f5f5f5',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
  summaryContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primaryColor,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 24,
  },
  explanationContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  doContainer: {
    marginBottom: 16,
  },
  dontContainer: {
    marginBottom: 16,
  },
  chatButton: {
    backgroundColor: Colors.primaryColor,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: Colors.primaryColor,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  chatButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
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
    marginBottom: 24,
    paddingVertical: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 12,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.primaryColor,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primaryColor,
    marginLeft: 4,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
  chatButtonIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  chatButtonSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
});

export default TodayFortuneScreen;
