import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { supabase } from '../../utils/database/supabaseClient';
import { calculateSaju } from '../../utils/saju/ganji_local';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import SabaLoader from '../../components/common/SabaLoader';
import BirthInfoForm, { BirthInfoFormData } from '../../components/forms/BirthInfoForm';
import { SajuCache } from '../../utils/saju/sajuCache';
import { TodayFortuneCache } from '../../utils/today-fortune/todayFortuneCache';
import { clearAllNewYearFortuneCache } from '../../utils/new-year-fortune/newYearFortuneCache';
import { convertSajuResultToDbFormat } from '../../utils/saju/calculatedSajuUtils';

interface BirthInfoScreenProps {
  navigation: {
    replace: (screenName: string) => void;
    goBack: () => void;
    canGoBack?: () => boolean;
    navigate: (screenName: string, params?: any) => void;
  };
  route: RouteProp<RootStackParamList, 'BirthInfo'>;
}

function BirthInfoScreen({ navigation, route }: BirthInfoScreenProps) {
  const [userId, setUserId] = useState<string | null>(null);

  // 현재 로그인한 사용자의 ID 가져오기
  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        // 사용자 정보가 없으면 로그인 화면으로
        navigation.replace('Login');
      }
    };
    getUserId();
  }, []);
  const [formData, setFormData] = useState<BirthInfoFormData>({
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    birthHour: '',
    birthMinute: '',
    gender: '',
    calendarType: '',
    isLeapMonth: false,
    isTimeUnknown: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  // 음력 선택 시 평달을 기본값으로 설정
  useEffect(() => {
    if (formData.calendarType === '음력') {
      setFormData(prev => ({ ...prev, isLeapMonth: false }));
    }
  }, [formData.calendarType]);

  const handleFormChange = (field: keyof BirthInfoFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  

  const handleSaveBirthInfo = async () => {
    // 키보드 닫기
    Keyboard.dismiss();
    
    // 입력값 검증
    if (!formData.birthYear || !formData.birthMonth || !formData.birthDay) {
      Alert.alert('오류', '생년월일을 모두 입력해주세요.');
      return;
    }
    if (!formData.gender) {
      Alert.alert('오류', '성별을 선택해주세요.');
      return;
    }
    if (!formData.isTimeUnknown && (!formData.birthHour || !formData.birthMinute)) {
      Alert.alert('오류', '시간을 입력해주세요.');
      return;
    }

    // 값 변환 및 유효성 검사
    const year = parseInt(formData.birthYear);
    const month = parseInt(formData.birthMonth);
    const day = parseInt(formData.birthDay);
    const hour = formData.isTimeUnknown ? null : parseInt(formData.birthHour);
    const minute = formData.isTimeUnknown ? null : parseInt(formData.birthMinute);

    if (year < 1900 || year > new Date().getFullYear()) {
      Alert.alert('오류', '올바른 년도를 입력해주세요.');
      return;
    }
    if (month < 1 || month > 12) {
      Alert.alert('오류', '올바른 월을 입력해주세요.');
      return;
    }
    if (day < 1 || day > 31) {
      Alert.alert('오류', '올바른 일을 입력해주세요.');
      return;
    }
    if (!formData.isTimeUnknown && hour !== null && minute !== null) {
      if (hour < 0 || hour > 23) {
        Alert.alert('오류', '올바른 시간을 입력해주세요.');
        return;
      }
      if (minute < 0 || minute > 59) {
        Alert.alert('오류', '올바른 분을 입력해주세요.');
        return;
      }
    }

    // 사주 계산
    let sajuResult;
    try {
      sajuResult = calculateSaju({
        year,
        month,
        day,
        hour,
        minute,
        isLunar: formData.calendarType === '음력',
        isLeapMonth: formData.isLeapMonth
      });
    } catch (error) {
      let errorMessage = '알 수 없는 오류가 발생했습니다.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      Alert.alert('오류', '사주 계산 중 오류가 발생했습니다: ' + errorMessage);
      return;
    }

    // 바로 저장 진행
    handleSaveWithSaju(sajuResult);
  };

interface SajuResult {
  yearHangulGanji: string;   // 년주 한글 간지
  monthHangulGanji: string;  // 월주 한글 간지
  dayHangulGanji: string;    // 일주 한글 간지
  timeHangulGanji: string;   // 시주 한글 간지
  
  stemSasin: string[];       // 천간 십신 [시, 일, 월, 년]
  branchSasin: string[];     // 지지 십신 [시, 일, 월, 년]
  sibun: string[];          // 십이운성 [시, 일, 월, 년]
  
  // 고급 사주 요소들
  sinsal: { [key: string]: string[] };      // 신살 정보
  gongmang: string;                         // 공망
  daewoon: any[];                           // 대운 리스트
  fiveProperties: { [key: string]: string }; // 오행 정보
  jijiAmjangan: { [key: string]: string };   // 지지암장간
  sal: { [key: string]: string[] };         // 살(殺) 정보
  guin: { [key: string]: string[] };        // 귀인 정보
  jijiRelations: { [key: string]: string[] }; // 지지 관계 (삼합, 육합, 삼형, 육충)
}


  const handleSaveWithSaju = async (sajuResult: SajuResult) => {
    setIsLoading(true);

    try {
      if (!userId) {
        Alert.alert('오류', '사용자 정보를 찾을 수 없습니다.');
        return;
      }

      // 기존 birth_info 레코드 확인
      const { data: existingData, error: checkError } = await supabase
        .from('birth_info')
        .select('id, name')
        .eq('user_id', userId)
        .single();

      // 사용자 이름 가져오기 (입력한 이름 우선, 없으면 기존 이름, 없으면 user_metadata에서)
      let userName = formData.name?.trim();
      if (!userName) {
        userName = existingData?.name;
      }
      if (!userName) {
        const { data: { user } } = await supabase.auth.getUser();
        userName = user?.user_metadata?.name || 
                   user?.user_metadata?.full_name || 
                   user?.user_metadata?.preferred_username || 
                   user?.user_metadata?.user_name || 
                   user?.email?.split('@')[0] || 
                   '사용자';
      }

      const birthData = {
        name: userName,
        year: parseInt(formData.birthYear),
        month: parseInt(formData.birthMonth),
        day: parseInt(formData.birthDay),
        hour: formData.isTimeUnknown ? null : parseInt(formData.birthHour),
        minute: formData.isTimeUnknown ? null : parseInt(formData.birthMinute),
        calendar_type: formData.calendarType === '음력' ? 'lunar' : 'solar',
        is_leap_month: formData.isLeapMonth,
        is_time_unknown: formData.isTimeUnknown,
        gender: formData.gender === '남성' ? 'male' : 'female',
      };

      let birthInfoId: string;
      let error;
      if (existingData) {
        // 기존 레코드가 있으면 업데이트
        birthInfoId = existingData.id;
        const { error: updateError } = await supabase
          .from('birth_info')
          .update(birthData)
          .eq('user_id', userId);
        error = updateError;
      } else {
        // 기존 레코드가 없으면 생성
        const { data: insertedData, error: insertError } = await supabase
          .from('birth_info')
          .insert({
            user_id: userId,
            ...birthData,
          })
          .select('id')
          .single();
        error = insertError;
        birthInfoId = insertedData?.id;
      }

      if (error || !birthInfoId) {
        Alert.alert('오류', '생년월일 정보 저장에 실패했습니다.');
        return;
      }

      // calculated_saju 테이블에 사주 데이터 저장
      const calculatedSajuData = {
        birth_info_id: birthInfoId,
        ...convertSajuResultToDbFormat(sajuResult),
      };

      const { error: calculatedSajuError } = await supabase
        .from('calculated_saju')
        .upsert(calculatedSajuData, {
          onConflict: 'birth_info_id',
        });

      if (calculatedSajuError) {
        console.error('calculated_saju 저장 오류:', calculatedSajuError);
        Alert.alert('오류', '사주 데이터 저장에 실패했습니다.');
        return;
      }

      // 생년월일이 변경되었으므로 해당 사용자의 모든 사주 분석 데이터 삭제
      const { error: deleteAnalysisError } = await supabase
        .from('saju_analyses')
        .delete()
        .eq('user_id', userId);

      if (deleteAnalysisError) {
        console.error('saju_analyses 삭제 오류:', deleteAnalysisError);
        // 분석 데이터 삭제 실패는 치명적이지 않으므로 계속 진행
      }

      // 생년월일이 변경되었으므로 모든 사주 관련 캐시 삭제
      await SajuCache.clearUserCache(userId);
      await TodayFortuneCache.clearTodayFortuneCache(userId);
      await clearAllNewYearFortuneCache(userId);

      // 저장 성공 시 redirectTo가 있으면 해당 화면으로, 없으면 MainTabs로 이동
      setTimeout(() => {
        try {
          const redirectTo = route.params?.redirectTo;
          if (redirectTo) {
            navigation.replace(redirectTo);
          } else {
            navigation.replace('MainTabs');
          }
        } catch (error) {
          console.error('네비게이션 에러:', error);
        }
      }, 100);

    } catch (error) {
      Alert.alert('오류', '생년월일 정보 저장에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            onScrollBeginDrag={Keyboard.dismiss}
            showsVerticalScrollIndicator={false}
          >
            <BirthInfoForm
              data={formData}
              onChange={handleFormChange}
              showTitle={true}
              title="사주 정보 입력"
              subtitle="사주 분석을 위해서만 활용됩니다."
            />

            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleSaveBirthInfo}
              disabled={isLoading}
            >
              <Text style={styles.saveButtonText}>저장하기</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.skipButton}
              onPress={() => {
                Keyboard.dismiss();
                if (typeof navigation.canGoBack === 'function' && navigation.canGoBack()) {
                  navigation.goBack();
                  return;
                }
                navigation.replace('MainTabs');
              }}
            >
              <Text style={styles.skipButtonText}>다음에 입력하기</Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* 로딩 오버레이 */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <SabaLoader size={60} message="" />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// 스타일 추가
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 25,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    padding: 25,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  saveButton: {
    backgroundColor: Colors.primaryColor,
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 0,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 0.3,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  disabledButton: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  skipButton: {
    padding: 8,
    marginTop: 8,
  },
  skipButtonText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default BirthInfoScreen;
