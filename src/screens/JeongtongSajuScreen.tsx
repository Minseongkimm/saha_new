import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../constants/colors';
import SectionHeader from '../components/SectionHeader';
import CustomHeader from '../components/CustomHeader';
import SajuChart from '../components/SajuChart';
import { supabase } from '../utils/supabaseClient';
import { SajuCache } from '../utils/sajuCache';

interface JeongtongSajuScreenProps {
  navigation: any;
}

const JeongtongSajuScreen: React.FC<JeongtongSajuScreenProps> = ({ navigation }) => {
  const [userSajuData, setUserSajuData] = useState<any>(null);
  const [llmAnalysis, setLlmAnalysis] = useState<any>(null);
  const [loadingChart, setLoadingChart] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [generatingAnalysis, setGeneratingAnalysis] = useState(false);

  useEffect(() => {
    loadSajuData();
  }, []);

  const loadSajuData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1단계: 만세력 표 데이터 로드 (캐시 우선)
      await loadCalculatedSaju(user.id);
      
      // 2단계: 사주 해석 데이터 로드 (백그라운드)
      loadAnalysisData(user.id);
      
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
        return;
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
      }
    } catch (error) {
      console.error('Error loading calculated saju:', error);
    } finally {
      setLoadingChart(false);
    }
  };

  const loadAnalysisData = async (userId: string) => {
    try {
      setLoadingAnalysis(true);
      
      // 1. 캐시에서 먼저 확인
      const cachedAnalysis = await SajuCache.getCachedAnalysis(userId);
      
      if (cachedAnalysis) {
        // 캐시가 있으면 즉시 표시
        setLlmAnalysis(cachedAnalysis);
        setLoadingAnalysis(false);
        return;
      }

      // 2. 캐시가 없으면 DB에서 조회 (향후 구현)
      // const dbAnalysis = await fetchAnalysisFromDatabase(userId);
      // if (dbAnalysis) {
      //   setLlmAnalysis(dbAnalysis);
      //   await SajuCache.setCachedAnalysis(userId, dbAnalysis);
      //   setLoadingAnalysis(false);
      //   return;
      // }

      // 3. 둘 다 없으면 "AI 사주 해석 받기" 버튼 표시
      setLoadingAnalysis(false);
      
    } catch (error) {
      console.error('Error loading analysis data:', error);
      setLoadingAnalysis(false);
    }
  };

  const generateLlmAnalysis = async () => {
    try {
      setGeneratingAnalysis(true);
      
      // LLM 분석 생성 로직 (향후 구현)
      // const analysis = await generateSajuAnalysis(userSajuData.calculatedSaju);
      
      // 임시 데이터 (실제로는 LLM API 호출)
      const mockAnalysis = {
        personality: "당신은 강한 의지력과 추진력을 가진 사람입니다...",
        career: "리더십이 강한 분야에서 성공할 가능성이 높습니다...",
        love: "진실한 사랑을 추구하며 깊은 관계를 원합니다...",
        health: "심장과 혈관 건강에 주의하시기 바랍니다...",
        advice: "자신의 강점을 살려 적극적으로 도전해보세요...",
        generatedAt: new Date().toISOString()
      };
      
      // 1. 상태 업데이트
      setLlmAnalysis(mockAnalysis);
      
      // 2. 캐시에 저장 (영구 저장)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await SajuCache.setCachedAnalysis(user.id, mockAnalysis);
      }
      
      // 3. DB에 저장 (향후 구현)
      // await saveAnalysisToDatabase(user.id, mockAnalysis);
      
    } catch (error) {
      console.error('Error generating LLM analysis:', error);
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
      <ScrollView showsVerticalScrollIndicator={false}>
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
              
              {generatingAnalysis ? (
                <View style={styles.analysisLoadingCard}>
                  <ActivityIndicator size="small" color={Colors.primaryColor} />
                  <Text style={styles.analysisLoadingText}>
                    AI가 당신의 사주를 분석하고 있어요...
                  </Text>
                </View>
              ) : llmAnalysis ? (
                <View style={styles.analysisCard}>
                  <Text style={styles.analysisTitle}>성격 분석</Text>
                  <Text style={styles.analysisText}>{llmAnalysis.personality}</Text>
                  
                  <Text style={styles.analysisTitle}>직업운</Text>
                  <Text style={styles.analysisText}>{llmAnalysis.career}</Text>
                  
                  <Text style={styles.analysisTitle}>연애운</Text>
                  <Text style={styles.analysisText}>{llmAnalysis.love}</Text>
                  
                  <Text style={styles.analysisTitle}>건강운</Text>
                  <Text style={styles.analysisText}>{llmAnalysis.health}</Text>
                  
                  <Text style={styles.analysisTitle}>조언</Text>
                  <Text style={styles.analysisText}>{llmAnalysis.advice}</Text>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.generateAnalysisButton}
                  onPress={generateLlmAnalysis}
                >
                  <Text style={styles.generateAnalysisButtonText}>
                    AI 사주 해석 받기
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>
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
    marginTop: 20,
  },
  analysisLoadingCard: {
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
  analysisLoadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
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
  generateAnalysisButton: {
    backgroundColor: Colors.primaryColor,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  generateAnalysisButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default JeongtongSajuScreen;
