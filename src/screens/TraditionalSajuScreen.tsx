import React, { useState, useEffect, useRef } from 'react';
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
import SajuChart from '../components/SajuChart';
import { supabase } from '../utils/supabaseClient';
import { SajuCache } from '../utils/sajuCache';
import { traditionalSajuService } from '../services/ai/traditionalSajuService';
import SajuAnalysis from '../components/SajuAnalysis';
import ChatStartBottomSheet from '../components/ChatStartBottomSheet';
import ProgressLoadingCard from '../components/ProgressLoadingCard';
import AIGuideSection from '../components/AIGuideSection';
import BottomFixedButton from '../components/BottomFixedButton';
import { startChatWithExpert } from '../utils/chatUtils';

interface TraditionalSajuScreenProps {
  navigation: any;
}

const TraditionalSajuScreen: React.FC<TraditionalSajuScreenProps> = ({ navigation }) => {
  const [userSajuData, setUserSajuData] = useState<any>(null);
  const [llmAnalysis, setLlmAnalysis] = useState<any>(null); // 임시로 null 유지하여 로딩화면 표시
  const [loadingChart, setLoadingChart] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [generatingAnalysis, setGeneratingAnalysis] = useState(false); // LLM 생성 활성화
  const [showChatModal, setShowChatModal] = useState(false);
  

  useEffect(() => {
    loadSajuData();
  }, []);

  const loadSajuData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1단계: 만세력 표 데이터 로드 (캐시 우선)
      const sajuData = await loadCalculatedSaju(user.id);
      
      // 2단계: 사주 해석 데이터 로드 (userSajuData가 설정된 후)
      if (sajuData && sajuData.calculatedSaju) {
        await loadAnalysisData(user.id, sajuData);
      }
      
    } catch (error) {
      console.error('Error loading saju data:', error);
    }
  };

  const loadCalculatedSaju = async (userId: string) => {
    try {
      // 1. 캐시에서 먼저 확인
      const cachedData = await SajuCache.getCachedCalculatedSaju(userId);
      
      if (cachedData) {
        // 캐시가 있으면 즉시 표시 (로딩 상태 변경 없음)
        setUserSajuData(cachedData);
        
        // 캐시에서 로드된 경우 LLM 호출하지 않음 (loadAnalysisData에서 캐시 확인)
        return cachedData;
      }

      // 캐시가 없을 때만 로딩 상태 시작
      setLoadingChart(true);

      // 2. 캐시가 없으면 DB에서 조회
      const { data: birthData, error } = await supabase
        .from('birth_infos')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (birthData && !error) {
        // 계산된 사주 데이터를 SajuChart 컴포넌트에서 사용할 수 있는 형태로 변환
        const formattedData = {
          name: birthData.name || '사용자',
          birthYear: birthData.year,
          birthMonth: birthData.month,
          birthDay: birthData.day,
          birthHour: birthData.hour || 0,
          birthMinute: birthData.minute || 0,
          gender: birthData.gender,
          calendarType: birthData.calendar_type,
          leapMonth: birthData.is_leap_month,
          timeUnknown: birthData.is_time_unknown,
          // 계산된 사주 정보
          calculatedSaju: birthData.saju_data || {},
          pillars: birthData.saju_data?.pillars || {},
          tenGods: birthData.saju_data?.ten_gods || {},
          lifeStages: birthData.saju_data?.life_stages || {},
        };
        
        setUserSajuData(formattedData);
        // 캐시에 저장 (영구 저장)
        await SajuCache.setCachedCalculatedSaju(userId, formattedData);
        
        // DB에서 로드 완료 (LLM은 loadAnalysisData에서 처리)
        return formattedData;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error loading calculated saju:', error);
      return null;
    } finally {
      setLoadingChart(false);
    }
  };

  const loadAnalysisData = async (userId: string, sajuData?: any) => {
    try {
      // 캐시에서 먼저 확인
      const cachedAnalysis = await SajuCache.getCachedAnalysis(userId);
      
      if (cachedAnalysis) {
        // 캐시가 있으면 즉시 표시 (로딩 상태 변경 없음)
        setLlmAnalysis(cachedAnalysis);
        return;
      }

      // 캐시가 없을 때만 로딩 상태 시작
      setLoadingAnalysis(true);

      // 캐시가 없으면 DB에서 조회
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // birth_info_id 가져오기
        const { data: birthData } = await supabase
          .from('birth_infos')
          .select('id')
          .eq('user_id', user.id)
          .single();
          
        if (birthData) {
          const dbAnalysis = await traditionalSajuService.getAnalysisFromDatabase(user.id, birthData.id);
          if (dbAnalysis) {
            setLlmAnalysis(dbAnalysis);
            await SajuCache.setCachedAnalysis(userId, dbAnalysis);
            setLoadingAnalysis(false);
            return;
          }
        }
      }

      // 둘 다 없으면 자동으로 LLM을 통해 사주 해석 생성
      setLoadingAnalysis(false);
      
      // 사용할 사주 데이터 결정 (매개변수로 받은 데이터 우선, 없으면 상태에서 가져오기)
      const dataToUse = sajuData || userSajuData;
      
      // 사주 데이터가 없으면 에러
      if (!dataToUse || !dataToUse.calculatedSaju) {
        console.error('사주 데이터가 로드되지 않음');
        return;
      }
      
      // 자동으로 사주 해석 생성
      await generateLlmAnalysis(dataToUse);
      
    } catch (error) {
      console.error('Error loading analysis data:', error);
      setLoadingAnalysis(false);
    }
  };

  const generateLlmAnalysis = async (sajuData?: any) => {
    try {
      setGeneratingAnalysis(true);
      
      // 사용할 사주 데이터 결정 (매개변수로 받은 데이터 우선, 없으면 상태에서 가져오기)
      const dataToUse = sajuData || userSajuData;
      
      if (!dataToUse || !dataToUse.calculatedSaju) {
        throw new Error('사주 데이터가 없습니다.');
      }
      
      // 사주 데이터를 분석용 형태로 변환
      const analysisInput = {
        name: dataToUse.name,
        birthInfo: `${dataToUse.birthYear}년 ${dataToUse.birthMonth}월 ${dataToUse.birthDay}일 ${dataToUse.birthHour}:${dataToUse.birthMinute} (${dataToUse.gender === 'male' ? '남성' : '여성'})`,
        yearGanji: dataToUse.calculatedSaju.yearHangulGanji,
        monthGanji: dataToUse.calculatedSaju.monthHangulGanji,
        dayGanji: dataToUse.calculatedSaju.dayHangulGanji,
        timeGanji: dataToUse.calculatedSaju.timeHangulGanji,
        stemSasin: dataToUse.calculatedSaju.stemSasin,
        branchSasin: dataToUse.calculatedSaju.branchSasin,
        sibun: dataToUse.calculatedSaju.sibun,
        fiveProperties: dataToUse.calculatedSaju.fiveProperties,
        sinsal: dataToUse.calculatedSaju.sinsal,
        guin: dataToUse.calculatedSaju.guin,
        gongmang: dataToUse.calculatedSaju.gongmang,
        jijiAmjangan: dataToUse.calculatedSaju.jijiAmjangan,
        jijiRelations: dataToUse.calculatedSaju.jijiRelations
      };
      
      // LLM 분석 생성
      const analysis = await traditionalSajuService.generateSajuAnalysis(analysisInput);
      
      // 1. 상태 업데이트
      setLlmAnalysis(analysis);
      
      // 캐시에 저장
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await SajuCache.setCachedAnalysis(user.id, analysis);
        
        // DB에 저장
        // birth_info_id 가져오기
        const { data: birthData } = await supabase
          .from('birth_infos')
          .select('id')
          .eq('user_id', user.id)
          .single();
          
        if (birthData) {
          await traditionalSajuService.saveAnalysisToDatabase(user.id, birthData.id, analysis);
        }
      }
      
    } catch (error) {
      console.error('Error generating LLM analysis:', error);
      
      // 에러 발생 시 llmAnalysis를 null로 설정하여 버튼이 다시 보이도록 함
      setLlmAnalysis(null);
      
      // 사용자에게 에러 알림 (선택사항)
      Alert.alert('오류', '사주 해석 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setGeneratingAnalysis(false);
    }
  };

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="정통사주"
        onBackPress={() => navigation.goBack()}
      />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          {/* 1단계: 만세력 표 */}
          {loadingChart && !userSajuData ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primaryColor} />
              <Text style={styles.loadingText}>만세력 표를 불러오는 중...</Text>
            </View>
          ) : userSajuData ? (
            <>
              <SectionHeader 
                title="정통 사주팔자" 
                description="전통 사주학으로 당신의 운명을 깊이 있게 분석합니다"
              />
              <SajuChart sajuData={userSajuData} />
            </>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataTitle}>사주 정보가 없습니다</Text>
              <Text style={styles.noDataDescription}>
                사주 정보를 입력하면 만세력 표를 확인할 수 있습니다
              </Text>
              <TouchableOpacity 
                style={styles.inputButton}
                onPress={() => navigation.navigate('SajuInfo')}
              >
                <Text style={styles.inputButtonText}>사주 정보 입력하기</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 2단계: 사주 해석 (사주 데이터가 있을 때만 표시) */}
          {userSajuData && userSajuData.calculatedSaju && (
            <View style={styles.analysisSection}>
              <SectionHeader 
                title="사주 해석" 
                description="인공지능이 당신의 사주를 깊이 있게 분석해드립니다"
              />
              
                     {generatingAnalysis && (
                       <ProgressLoadingCard
                         title="AI가 당신의 사주를 분석하고 있어요"
                         description="처음 분석만 15초, 다음부터는 즉시 확인 가능해요!"
                         duration={15000}
                         showProgress={true}
                         showIcon={true}
                       />
                     )}
                     
                     {llmAnalysis && llmAnalysis.overall && (
                       <View style={styles.analysisContentContainer}>
                         <SajuAnalysis analysis={llmAnalysis} />
                       </View>
                     )}
                     
                     {/* AI 도사 연결 안내 */}
                     {llmAnalysis && llmAnalysis.overall && (
                       <AIGuideSection
                         title="더 깊이 있는 이야기가 필요하다면"
                         description={`궁금한 점이나 더 자세한 해석이 필요하시다면${'\n'}AI 도사와 1:1 대화를 통해 맞춤형 조언을 받아보세요.`}
                         imageSource={require('../../assets/logo/logo_icon.png')}
                       />
                     )}

            </View>
          )}
        </View>
      </ScrollView>
      

      
      {/* 하단 고정 버튼 */}
      <BottomFixedButton
        onPress={() => setShowChatModal(true)}
        text="AI 도사와 이야기 나누기"
      />
      
      {/* 채팅 시작 바텀 시트 */}
      <ChatStartBottomSheet
        visible={showChatModal}
        onClose={() => setShowChatModal(false)}
        onStartChat={() => {
          setShowChatModal(false);
          startChatWithExpert(navigation, 'traditional_saju');
        }}
        title="AI 사주 전문가와 이야기하기"
        description="당신의 사주를 기반으로 AI가 인생의 실마리를 드립니다."
        buttonText="시작하기"
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
    paddingBottom: 80, // 하단 버튼 높이만큼 패딩 추가
  },
  content: {
    padding: 20,
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
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    minHeight: 500,
    paddingTop: 150,
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
  analysisSection: {
    marginTop: 0,
  },
  analysisContentContainer: {
    marginTop: 15,
  },
  analysisCard: {
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
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primaryColor,
    marginTop: 16,
    marginBottom: 8,
  },
  analysisText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default TraditionalSajuScreen;
