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
import { startChatWithExpert } from '../utils/chatUtils';

interface JeongtongSajuScreenProps {
  navigation: any;
}

const JeongtongSajuScreen: React.FC<JeongtongSajuScreenProps> = ({ navigation }) => {
  const [userSajuData, setUserSajuData] = useState<any>(null);
  const [llmAnalysis, setLlmAnalysis] = useState<any>(null); // 임시로 null 유지하여 로딩화면 표시
  const [loadingChart, setLoadingChart] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [generatingAnalysis, setGeneratingAnalysis] = useState(false); // LLM 생성 활성화
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [iconScale, setIconScale] = useState(1);
  const [showChatModal, setShowChatModal] = useState(false);
  
  // 애니메이션 인터벌 참조
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const iconIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  

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
        // 캐시가 있으면 즉시 표시
        setUserSajuData(cachedData);
        setLoadingChart(false);
        
        // 캐시에서 로드된 경우 LLM 호출하지 않음 (loadAnalysisData에서 캐시 확인)
        return cachedData;
      }

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
      setLoadingAnalysis(true);
      
      // 캐시에서 먼저 확인
      const cachedAnalysis = await SajuCache.getCachedAnalysis(userId);
      
      if (cachedAnalysis) {
        // 캐시가 있으면 즉시 표시
        setLlmAnalysis(cachedAnalysis);
        setLoadingAnalysis(false);
        return;
      }

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
    const startTime = Date.now(); // 시작 시간 기록
    
    try {
      setGeneratingAnalysis(true);
      setAnalysisProgress(0);
      
      // 진행률 시뮬레이션 시작 (15초 기준으로 조정)
      const startTime = Date.now();
      const targetDuration = 15000; // 15초
      
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const timeBasedProgress = Math.min((elapsed / targetDuration) * 90, 90); // 90%까지 시간 기반
        
        setAnalysisProgress(prev => {
          // 시간 기반 진행률과 이전 값 중 더 큰 값 사용 (뒤로 가지 않도록)
          return Math.max(timeBasedProgress, prev);
        });
      }, 100); // 100ms마다 업데이트로 부드러운 진행
      
      // 아이콘 애니메이션 시작
      iconIntervalRef.current = setInterval(() => {
        setIconScale(prev => {
          // 0.9 ~ 1.1 사이에서 부드럽게 변화
          const time = Date.now() / 1000;
          return 1 + Math.sin(time * 2) * 0.1;
        });
      }, 50); // 50ms마다 업데이트로 부드러운 애니메이션
      
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
      
      // 정통사주 해석 생성 시작
      
      // LLM 분석 생성
      const analysis = await traditionalSajuService.generateSajuAnalysis(analysisInput);
      
      // 진행률 100%로 완료 (부드러운 완료 애니메이션)
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (iconIntervalRef.current) {
        clearInterval(iconIntervalRef.current);
        iconIntervalRef.current = null;
      }
      
      // 100%로 부드럽게 완료
      setAnalysisProgress(100);
      
      // 완료 후 잠시 대기 (사용자가 100%를 볼 수 있도록)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 정통사주 해석 생성 완료
      
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
      
      // 에러 발생 시에도 인터벌 정리
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (iconIntervalRef.current) {
        clearInterval(iconIntervalRef.current);
        iconIntervalRef.current = null;
      }
      
      // 에러 발생 시 llmAnalysis를 null로 설정하여 버튼이 다시 보이도록 함
      setLlmAnalysis(null);
      
      // 사용자에게 에러 알림 (선택사항)
      Alert.alert('오류', '사주 해석 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setGeneratingAnalysis(false);
      setAnalysisProgress(0);
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
          {loadingChart ? (
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
                       <View style={styles.analysisLoadingContainer}>
                         <Image 
                           source={require('../../assets/logo/logo_icon.png')} 
                           style={[
                             styles.loadingIcon,
                             { transform: [{ scale: iconScale }] }
                           ]}
                         />
                         <Text style={styles.analysisLoadingText}>
                           AI가 당신의 사주를 분석하고 있어요...{'\n'}
                           <Text style={styles.loadingSubText}>
                             약 15초 정도 소요됩니다
                           </Text>
                         </Text>
                         <View style={styles.progressContainer}>
                           <View style={styles.progressBar}>
                             <View 
                               style={[
                                 styles.progressFill, 
                                 { width: `${analysisProgress}%` }
                               ]} 
                             />
                           </View>
                           <Text style={styles.progressText}>
                             {Math.round(analysisProgress)}%
                           </Text>
                           
                           {/* 작은 로딩바 추가 */}
                           <View style={styles.smallLoadingContainer}>
                             <View style={styles.smallLoadingBar}>
                               <View 
                                 style={[
                                   styles.smallLoadingFill, 
                                   { width: `${analysisProgress}%` }
                                 ]} 
                               />
                             </View>
                           </View>
                         </View>
                       </View>
                     )}
                     
                     {llmAnalysis && llmAnalysis.overall && (
                       <View style={styles.analysisContentContainer}>
                         <SajuAnalysis analysis={llmAnalysis} />
                       </View>
                     )}
                     
                     {/* AI 도사 연결 안내 */}
                     {llmAnalysis && llmAnalysis.overall && (
                       <View style={styles.aiGuideSection}>
                         <View style={styles.aiGuideHeader}>
                           <View style={styles.aiGuideIcon}>
                             <Image 
                               source={require('../../assets/logo/logo_icon.png')} 
                               style={styles.aiGuideLogo}
                             />
                           </View>
                           <Text style={styles.aiGuideTitle}>더 깊이 있는 이야기가 필요하다면</Text>
                         </View>
                         <Text style={styles.aiGuideText}>
                           궁금한 점이나 더 자세한 해석이 필요하시다면{'\n'}
                           AI 도사와 1:1 대화를 통해 맞춤형 조언을 받아보세요.
                         </Text>
                       </View>
                     )}
            </View>
          )}
        </View>
      </ScrollView>
      

      
      {/* 하단 고정 버튼 */}
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity 
          style={styles.bottomButton}
          onPress={() => setShowChatModal(true)}
        >
          <Text style={styles.bottomButtonText}>AI 도사와 이야기 나누기</Text>
        </TouchableOpacity>
      </View>
      
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
         analysisLoadingContainer: {
           alignItems: 'center',
           paddingVertical: 25,
           paddingHorizontal: 20,
         },
         analysisLoadingText: {
           fontSize: 14,
           color: '#666',
           marginTop: 8,
           textAlign: 'center',
         },
         loadingSubText: {
           fontSize: 12,
           color: '#999',
           marginTop: 4,
         },
  loadingIcon: {
    width: 65,
    height: 65,
    marginBottom: 12,
    marginTop: 10,
  },
  progressContainer: {
    marginTop: 5,
    alignItems: 'center',
  },
  progressBar: {
    width: '80%',
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primaryColor,
    borderRadius: 4,
  },
         progressText: {
           fontSize: 12,
           color: Colors.primaryColor,
           marginTop: 8,
           fontWeight: '600',
         },
         smallLoadingContainer: {
           marginTop: 8,
           alignItems: 'center',
         },
         smallLoadingBar: {
           width: 120,
           height: 3,
           backgroundColor: '#f0f0f0',
           borderRadius: 2,
           overflow: 'hidden',
         },
         smallLoadingFill: {
           height: '100%',
           backgroundColor: Colors.primaryColor,
           borderRadius: 2,
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
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    paddingHorizontal: 25,
    paddingVertical: 12,
    paddingBottom: 30, // 하단 safe area 고려
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  bottomButton: {
    backgroundColor: Colors.primaryColor,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  aiGuideSection: {
    marginTop: 10,
    // marginBottom: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: Colors.primaryColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    alignItems: 'center',
  },
  aiGuideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    justifyContent: 'center',
  },
  aiGuideIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  aiGuideIconText: {
    fontSize: 16,
  },
  aiGuideLogo: {
    width: 20,
    height: 20,
  },
  aiGuideTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    textAlign: 'center',
  },
  aiGuideText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#5a6c7d',
    marginBottom: 16,
    textAlign: 'center',
  },
  aiGuideCta: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.primaryColor,
    borderRadius: 20,
  },
  aiGuideCtaText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
  },
});

export default JeongtongSajuScreen;
