import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../constants/colors';
import { SajuCalculator } from '../utils/saju-calculator/core/SajuCalculator';
import { SajuInfo } from '../utils/saju-calculator/types';
import BirthInputForm, { BirthInfo } from '../components/BirthInputForm';
import { supabase } from '../utils/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CompatibilityScreenProps {
  navigation: any;
}

const CompatibilityScreen: React.FC<CompatibilityScreenProps> = ({ navigation }) => {
  const [myInfo, setMyInfo] = useState<BirthInfo>({
    name: '',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    birthHour: '',
    birthMinute: '',
    gender: 'male',
    calendarType: 'solar',
    isLeapMonth: false,
    isTimeUnknown: false,
  });

  const [partnerInfo, setPartnerInfo] = useState<BirthInfo>({
    name: '',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    birthHour: '',
    birthMinute: '',
    gender: 'female',
    calendarType: 'solar',
    isLeapMonth: false,
    isTimeUnknown: false,
  });

  const [compatibilityResult, setCompatibilityResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [loadingMyInfo, setLoadingMyInfo] = useState(true);

  const sajuCalculator = new SajuCalculator();

  // 내 정보 불러오기
  useEffect(() => {
    loadMyBirthInfo();
  }, []);

  const loadMyBirthInfo = async () => {
    try {
      setLoadingMyInfo(true);
      
      // 현재 로그인된 사용자 정보 가져오기
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        Alert.alert('알림', '로그인이 필요합니다.');
        navigation.goBack();
        return;
      }

      // 사용자 이름은 Auth 메타데이터에서 가져오기
      const userName = user.user_metadata?.full_name || 
                      user.user_metadata?.name || 
                      user.user_metadata?.preferred_username || 
                      user.user_metadata?.user_name || 
                      user.email?.split('@')[0] || 
                      '사용자';

      // 캐시 우선 표시
      const cacheKey = `birth_info_${user.id}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (cachedData) {
        const parsedCache = JSON.parse(cachedData);
        setMyInfo({
          name: parsedCache.name || userName,
          birthYear: parsedCache.year?.toString() || '',
          birthMonth: parsedCache.month?.toString() || '',
          birthDay: parsedCache.day?.toString() || '',
          birthHour: parsedCache.hour?.toString() || '0',
          birthMinute: parsedCache.minute?.toString() || '0',
          gender: parsedCache.gender === 'male' ? 'male' : 'female',
          calendarType: parsedCache.calendar_type === 'lunar' ? 'lunar' : 'solar',
          isLeapMonth: parsedCache.is_leap_month || false,
          isTimeUnknown: parsedCache.is_time_unknown || false,
        });
        setLoadingMyInfo(false);
      }

      // 백그라운드에서 최신 데이터 가져오기
      const { data: birthData, error: birthError } = await supabase
        .from('birth_infos')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (birthError) {
        // 생년월일 정보가 없는 경우
        if (!cachedData) {
          Alert.alert(
            '정보 없음', 
            '사주 정보가 없습니다. 먼저 내 정보를 입력해주세요.',
            [
              { text: '취소', style: 'cancel' },
              { text: '입력하러 가기', onPress: () => navigation.navigate('SajuInfo') }
            ]
          );
          return;
        }
      } else {
        // 최신 데이터로 업데이트
        setMyInfo({
          name: birthData.name || userName,
          birthYear: birthData.year?.toString() || '',
          birthMonth: birthData.month?.toString() || '',
          birthDay: birthData.day?.toString() || '',
          birthHour: birthData.hour?.toString() || '0',
          birthMinute: birthData.minute?.toString() || '0',
          gender: birthData.gender === 'male' ? 'male' : 'female',
          calendarType: birthData.calendar_type === 'lunar' ? 'lunar' : 'solar',
          isLeapMonth: birthData.is_leap_month || false,
          isTimeUnknown: birthData.is_time_unknown || false,
        });

        // 캐시 업데이트
        await AsyncStorage.setItem(cacheKey, JSON.stringify(birthData));
      }
    } catch (error) {
      console.error('Error loading birth info:', error);
      Alert.alert('오류', '내 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoadingMyInfo(false);
    }
  };

  // 간단한 사주 변환 (실제로는 더 정확한 변환이 필요)
  const convertToSaju = (person: BirthInfo): SajuInfo => {
    // 임시 사주 데이터 (실제로는 달력 계산이 필요)
    const sampleSaju = [
      { yearGanji: "甲子", monthGanji: "丙寅", dayGanji: "戊辰", timeGanji: "庚午" },
      { yearGanji: "乙丑", monthGanji: "丁卯", dayGanji: "己巳", timeGanji: "辛未" },
      { yearGanji: "丙寅", monthGanji: "戊辰", dayGanji: "庚午", timeGanji: "壬申" },
      { yearGanji: "丁卯", monthGanji: "己巳", dayGanji: "辛未", timeGanji: "癸酉" },
    ];
    
    const randomIndex = Math.floor(Math.random() * sampleSaju.length);
    const selected = sampleSaju[randomIndex];
    
    return {
      yearGanji: selected.yearGanji,
      monthGanji: selected.monthGanji,
      dayGanji: selected.dayGanji,
      timeGanji: selected.timeGanji,
      gender: person.gender === 'male' ? 0 : 1,
      birthYear: parseInt(person.birthYear) || 1990,
    };
  };

  const analyzeCompatibility = async () => {
    // 입력 검증
    if (!myInfo.name || !myInfo.birthYear) {
      Alert.alert('알림', '내 정보가 없습니다. 먼저 내 정보를 입력해주세요.');
      return;
    }
    
    if (!partnerInfo.name || !partnerInfo.birthYear) {
      Alert.alert('알림', '상대방의 필수 정보를 입력해주세요.');
      return;
    }

    setLoading(true);
    
    try {
      const mySaju = convertToSaju(myInfo);
      const partnerSaju = convertToSaju(partnerInfo);
      
      console.log('=== 내 사주 정보 ===');
      console.log('기본 사주:', mySaju);
      
      // 내 사주 상세 분석
      const myDetailedAnalysis = sajuCalculator.analyzeSaju(mySaju);
      console.log('내 상세 분석:', myDetailedAnalysis);
      
      console.log('=== 상대방 사주 정보 ===');
      console.log('기본 사주:', partnerSaju);
      
      // 상대방 사주 상세 분석
      const partnerDetailedAnalysis = sajuCalculator.analyzeSaju(partnerSaju);
      console.log('상대방 상세 분석:', partnerDetailedAnalysis);
      
      console.log('=== 궁합 분석 결과 ===');
      const result = sajuCalculator.analyzeCompatibility(mySaju, partnerSaju);
      console.log('궁합 결과:', result);
      
      // 결과에 각자의 상세 분석 추가
      const enhancedResult = {
        ...result,
        myAnalysis: myDetailedAnalysis,
        partnerAnalysis: partnerDetailedAnalysis,
        myInfo: myInfo,
        partnerInfo: partnerInfo,
        mySaju: mySaju,
        partnerSaju: partnerSaju
      };
      
      setCompatibilityResult(enhancedResult);
      setShowResult(true);
    } catch (error) {
      console.error('궁합 분석 오류:', error);
      Alert.alert('오류', '궁합 분석 중 문제가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#4CAF50';
    if (score >= 65) return '#8BC34A';
    if (score >= 50) return '#FFC107';
    if (score >= 35) return '#FF9800';
    return '#F44336';
  };

  const getScoreText = (score: number): string => {
    if (score >= 80) return '매우 좋음';
    if (score >= 65) return '좋음';
    if (score >= 50) return '보통';
    if (score >= 35) return '주의';
    return '매우 주의';
  };


  const CompatibilityResultModal = () => (
    <Modal visible={showResult} animationType="slide" onRequestClose={() => setShowResult(false)}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>궁합 분석 결과</Text>
          <TouchableOpacity onPress={() => setShowResult(false)}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {compatibilityResult && (
            <>
              {/* 종합 점수 */}
              <View style={styles.overallScoreCard}>
                <Text style={styles.overallScoreTitle}>종합 궁합 점수</Text>
                <View style={styles.scoreCircle}>
                  <Text style={[styles.scoreNumber, { color: getScoreColor(compatibilityResult.score) }]}>
                    {compatibilityResult.score}
                  </Text>
                  <Text style={styles.scoreMax}>/ 100</Text>
                </View>
                <Text style={[styles.overallResult, { color: getScoreColor(compatibilityResult.score) }]}>
                  {compatibilityResult.overall}
                </Text>
              </View>

              {/* 각자의 사주 정보 */}
              {compatibilityResult.mySaju && compatibilityResult.partnerSaju && (
                <View style={styles.sajuInfoSection}>
                  <Text style={styles.sajuSectionTitle}>📊 각자의 사주 정보</Text>
                  
                  {/* 내 사주 */}
                  <View style={styles.personSajuCard}>
                    <Text style={styles.personSajuTitle}>
                      {compatibilityResult.myInfo?.name || '나'} ({compatibilityResult.myInfo?.gender === 'male' ? '남성' : '여성'})
                    </Text>
                    <View style={styles.sajuPillars}>
                      <View style={styles.pillarItem}>
                        <Text style={styles.pillarLabel}>년주</Text>
                        <Text style={styles.pillarValue}>{compatibilityResult.mySaju.yearGanji}</Text>
                      </View>
                      <View style={styles.pillarItem}>
                        <Text style={styles.pillarLabel}>월주</Text>
                        <Text style={styles.pillarValue}>{compatibilityResult.mySaju.monthGanji}</Text>
                      </View>
                      <View style={styles.pillarItem}>
                        <Text style={styles.pillarLabel}>일주</Text>
                        <Text style={[styles.pillarValue, styles.dayPillar]}>{compatibilityResult.mySaju.dayGanji}</Text>
                      </View>
                      <View style={styles.pillarItem}>
                        <Text style={styles.pillarLabel}>시주</Text>
                        <Text style={styles.pillarValue}>{compatibilityResult.mySaju.timeGanji}</Text>
                      </View>
                    </View>
                    
                    {compatibilityResult.myAnalysis && (
                      <View style={styles.analysisDetails}>
                        {compatibilityResult.myAnalysis.sinsal && Object.keys(compatibilityResult.myAnalysis.sinsal).length > 0 && (
                          <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>주요 신살</Text>
                            <Text style={styles.detailValue}>
                              {Object.keys(compatibilityResult.myAnalysis.sinsal).slice(0, 3).join(', ')}
                              {Object.keys(compatibilityResult.myAnalysis.sinsal).length > 3 ? ' 외' : ''}
                            </Text>
                          </View>
                        )}
                        {compatibilityResult.myAnalysis.gongmang && (
                          <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>공망</Text>
                            <Text style={styles.detailValue}>{compatibilityResult.myAnalysis.gongmang}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>

                  {/* 상대방 사주 */}
                  <View style={styles.personSajuCard}>
                    <Text style={styles.personSajuTitle}>
                      {compatibilityResult.partnerInfo?.name || '상대방'} ({compatibilityResult.partnerInfo?.gender === 'male' ? '남성' : '여성'})
                    </Text>
                    <View style={styles.sajuPillars}>
                      <View style={styles.pillarItem}>
                        <Text style={styles.pillarLabel}>년주</Text>
                        <Text style={styles.pillarValue}>{compatibilityResult.partnerSaju.yearGanji}</Text>
                      </View>
                      <View style={styles.pillarItem}>
                        <Text style={styles.pillarLabel}>월주</Text>
                        <Text style={styles.pillarValue}>{compatibilityResult.partnerSaju.monthGanji}</Text>
                      </View>
                      <View style={styles.pillarItem}>
                        <Text style={styles.pillarLabel}>일주</Text>
                        <Text style={[styles.pillarValue, styles.dayPillar]}>{compatibilityResult.partnerSaju.dayGanji}</Text>
                      </View>
                      <View style={styles.pillarItem}>
                        <Text style={styles.pillarLabel}>시주</Text>
                        <Text style={styles.pillarValue}>{compatibilityResult.partnerSaju.timeGanji}</Text>
                      </View>
                    </View>
                    
                    {compatibilityResult.partnerAnalysis && (
                      <View style={styles.analysisDetails}>
                        {compatibilityResult.partnerAnalysis.sinsal && Object.keys(compatibilityResult.partnerAnalysis.sinsal).length > 0 && (
                          <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>주요 신살</Text>
                            <Text style={styles.detailValue}>
                              {Object.keys(compatibilityResult.partnerAnalysis.sinsal).slice(0, 3).join(', ')}
                              {Object.keys(compatibilityResult.partnerAnalysis.sinsal).length > 3 ? ' 외' : ''}
                            </Text>
                          </View>
                        )}
                        {compatibilityResult.partnerAnalysis.gongmang && (
                          <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>공망</Text>
                            <Text style={styles.detailValue}>{compatibilityResult.partnerAnalysis.gongmang}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* 세부 분석 */}
              <View style={styles.detailsCard}>
                <Text style={styles.detailsTitle}>세부 분석</Text>
                
                {Object.entries(compatibilityResult.categories).map(([key, category]: [string, any]) => (
                  <View key={key} style={styles.categoryItem}>
                    <View style={styles.categoryHeader}>
                      <Text style={styles.categoryName}>
                        {key === 'dayPillar' ? '일주 궁합' :
                         key === 'fiveElements' ? '오행 궁합' :
                         key === 'jijiRelation' ? '지지 관계' : '신살 궁합'}
                      </Text>
                      <Text style={[styles.categoryScore, { color: getScoreColor(category.score) }]}>
                        {category.score}점
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { 
                            width: `${category.score}%`,
                            backgroundColor: getScoreColor(category.score)
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.categoryDescription}>{category.description}</Text>
                  </View>
                ))}
              </View>

              {/* 강점과 약점 */}
              {compatibilityResult.strengths.length > 0 && (
                <View style={styles.strengthsCard}>
                  <Text style={styles.strengthsTitle}>👍 강점</Text>
                  {compatibilityResult.strengths.map((strength: string, index: number) => (
                    <Text key={index} style={styles.strengthItem}>• {strength}</Text>
                  ))}
                </View>
              )}

              {compatibilityResult.weaknesses.length > 0 && (
                <View style={styles.weaknessesCard}>
                  <Text style={styles.weaknessesTitle}>⚠️ 주의사항</Text>
                  {compatibilityResult.weaknesses.map((weakness: string, index: number) => (
                    <Text key={index} style={styles.weaknessItem}>• {weakness}</Text>
                  ))}
                </View>
              )}

              {/* 추천사항 */}
              <View style={styles.recommendationsCard}>
                <Text style={styles.recommendationsTitle}>💡 추천사항</Text>
                {compatibilityResult.recommendations.map((recommendation: string, index: number) => (
                  <Text key={index} style={styles.recommendationItem}>• {recommendation}</Text>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>사주 궁합</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.description}>
          <Text style={styles.descriptionTitle}>사주 궁합 분석</Text>
          <Text style={styles.descriptionText}>
            나와 상대방의 사주를 분석하여 궁합을 확인해보세요.{'\n'}
            일주, 오행, 지지관계, 신살 등을 종합적으로 분석합니다.
          </Text>
        </View>

        {/* 내 정보 표시 */}
        {loadingMyInfo ? (
          <View style={styles.myInfoCard}>
            <View style={styles.myInfoHeader}>
              <View style={styles.myInfoIconContainer}>
                <Text style={styles.myInfoIcon}>👤</Text>
              </View>
              <Text style={styles.myInfoTitle}>내 정보</Text>
            </View>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.primaryColor} />
              <Text style={styles.loadingText}>정보를 불러오는 중...</Text>
            </View>
          </View>
        ) : (
          <View style={styles.myInfoCard}>
            <View style={styles.myInfoHeader}>
              <View style={styles.myInfoIconContainer}>
                <Text style={styles.myInfoIcon}>👤</Text>
              </View>
              <View style={styles.myInfoTitleContainer}>
                <Text style={styles.myInfoTitle}>내 정보</Text>
                <Text style={styles.myInfoSubtitle}>나의 사주 정보</Text>
              </View>
            </View>
            
            <View style={styles.myInfoContent}>
              <View style={styles.myInfoRow}>
                <View style={styles.myInfoItem}>
                  <Text style={styles.myInfoLabel}>이름</Text>
                  <Text style={styles.myInfoValue}>{myInfo.name}</Text>
                </View>
                <View style={styles.myInfoItem}>
                  <Text style={styles.myInfoLabel}>성별</Text>
                  <View style={styles.genderBadge}>
                    <Text style={styles.genderBadgeText}>
                      {myInfo.gender === 'male' ? '남성' : '여성'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.myInfoRow}>
                <View style={styles.myInfoItem}>
                  <Text style={styles.myInfoLabel}>생년월일</Text>
                  <Text style={styles.myInfoValue}>
                    {myInfo.birthYear}.{myInfo.birthMonth}.{myInfo.birthDay}
                  </Text>
                </View>
                <View style={styles.myInfoItem}>
                  <Text style={styles.myInfoLabel}>달력</Text>
                  <View style={styles.calendarBadge}>
                    <Text style={styles.calendarBadgeText}>
                      {myInfo.calendarType === 'lunar' ? '음력' : '양력'}
                      {myInfo.isLeapMonth ? ' 윤달' : ''}
                    </Text>
                  </View>
                </View>
              </View>

              {!myInfo.isTimeUnknown && (
                <View style={styles.myInfoRow}>
                  <View style={styles.myInfoItem}>
                    <Text style={styles.myInfoLabel}>시간</Text>
                    <Text style={styles.myInfoValue}>
                      {myInfo.birthHour}시 {myInfo.birthMinute}분
                    </Text>
                  </View>
                  <View style={styles.myInfoItem} />
                </View>
              )}
            </View>
          </View>
        )}

        {/* 상대방 정보 입력 */}
        <BirthInputForm
          birthInfo={partnerInfo}
          setBirthInfo={setPartnerInfo}
          title="상대방 정보"
          showName={true}
        />

        <TouchableOpacity 
          style={[styles.analyzeButton, loading && styles.analyzeButtonDisabled]}
          onPress={analyzeCompatibility}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Icon name="heart" size={20} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.analyzeButtonText}>궁합 분석하기</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.notice}>
          <Icon name="information-circle-outline" size={16} color="#666" />
          <Text style={styles.noticeText}>
            현재는 미리보기 버전으로 임시 데이터를 사용합니다.{'\n'}
            정확한 사주 계산을 위해서는 음력 변환이 필요합니다.
          </Text>
        </View>
      </ScrollView>

      <CompatibilityResultModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  description: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginVertical: 16,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  myInfoCard: {
    backgroundColor: 'white',
    marginHorizontal: 5,
    marginBottom: 16,
    borderRadius: 16,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  myInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: `${Colors.primaryColor}08`,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  myInfoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryColor,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: Colors.primaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  myInfoIcon: {
    fontSize: 20,
  },
  myInfoTitleContainer: {
    flex: 1,
  },
  myInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  myInfoSubtitle: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  myInfoContent: {
    padding: 20,
  },
  myInfoRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  myInfoItem: {
    flex: 1,
    marginRight: 12,
  },
  myInfoLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  myInfoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  genderBadge: {
    backgroundColor: Colors.primaryColor,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  genderBadgeText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  calendarBadge: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignSelf: 'flex-start',
  },
  calendarBadgeText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  analyzeButton: {
    backgroundColor: Colors.primaryColor,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
  },
  analyzeButtonDisabled: {
    backgroundColor: '#ccc',
  },
  analyzeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    gap: 8,
  },
  noticeText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
    lineHeight: 16,
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  overallScoreCard: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 16,
  },
  overallScoreTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  scoreCircle: {
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  scoreMax: {
    fontSize: 16,
    color: '#666',
    marginTop: -8,
  },
  overallResult: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  detailsCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  categoryItem: {
    marginBottom: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  categoryScore: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  categoryDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  strengthsCard: {
    backgroundColor: '#f8fff8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  strengthsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  strengthItem: {
    fontSize: 12,
    color: '#388E3C',
    marginBottom: 4,
    lineHeight: 16,
  },
  weaknessesCard: {
    backgroundColor: '#fff8f8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  weaknessesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#C62828',
    marginBottom: 8,
  },
  weaknessItem: {
    fontSize: 12,
    color: '#D32F2F',
    marginBottom: 4,
    lineHeight: 16,
  },
  recommendationsCard: {
    backgroundColor: '#f8f8ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primaryColor,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primaryColor,
    marginBottom: 8,
  },
  recommendationItem: {
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
    lineHeight: 16,
  },
  
  // 사주 정보 섹션 스타일
  sajuInfoSection: {
    marginBottom: 16,
  },
  sajuSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  personSajuCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  personSajuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primaryColor,
    marginBottom: 12,
    textAlign: 'center',
  },
  sajuPillars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  pillarItem: {
    alignItems: 'center',
    flex: 1,
  },
  pillarLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  pillarValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 40,
    textAlign: 'center',
  },
  dayPillar: {
    backgroundColor: Colors.primaryColor,
    color: 'white',
  },
  analysisDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    flex: 1,
  },
  detailValue: {
    fontSize: 12,
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
});

export default CompatibilityScreen;
