import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  Platform,
  StatusBar,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { supabase } from '../../utils/database/supabaseClient';
import { calculateSaju } from '../../utils/saju/ganji_local';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SabaLoader from '../../components/common/SabaLoader';
import Icon from 'react-native-vector-icons/Ionicons';
import BirthInfoForm, { BirthInfoFormData } from '../../components/forms/BirthInfoForm';
import { SajuCache } from '../../utils/saju/sajuCache';
import { TodayFortuneCache } from '../../utils/today-fortune/todayFortuneCache';
import { clearAllNewYearFortuneCache } from '../../utils/new-year-fortune/newYearFortuneCache';
import { convertSajuResultToDbFormat } from '../../utils/saju/calculatedSajuUtils';
import { getCurrentUserSafely } from '../../utils/user/authUtils';
import { safeGoBack } from '../../utils/navigation/safeGoBack';
import { isIPad } from '../../utils/platform';

const IS_IPAD = isIPad();

interface SajuInfoScreenProps {
  navigation: any;
}

const SajuInfoScreen: React.FC<SajuInfoScreenProps> = ({ navigation }) => {
  const [sajuInfo, setSajuInfo] = useState({
    name: '',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    birthHour: '',
    birthMinute: '',
    gender: '',
    calendarType: '',
    isLeapMonth: false,
    timeUnknown: false,
  });

  const [originalSajuInfo, setOriginalSajuInfo] = useState({
    name: '',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    birthHour: '',
    birthMinute: '',
    gender: '',
    calendarType: '',
    isLeapMonth: false,
    timeUnknown: false,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const yearScrollRef = useRef<ScrollView>(null);
  const monthScrollRef = useRef<ScrollView>(null);
  const dayScrollRef = useRef<ScrollView>(null);
  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);

  // 사용자 정보 로드
  useEffect(() => {
    loadUserBirthInfo();
  }, []);

  const loadUserBirthInfo = async () => {
    try {
      setLoading(true);
      
      // 현재 로그인된 사용자 정보 가져오기
      const { status, user } = await getCurrentUserSafely();
      if (status === 'network_error') {
        // 네트워크 이슈일 때는 유저에게 알림을 띄우지 않고 조용히 중단
        setLoading(false);
        return;
      }
      if (status === 'unauthenticated' || !user) {
        Alert.alert('오류', '로그인이 필요합니다.');
        safeGoBack(navigation);
        return;
      }

      setUserId(user.id);

      // 사용자 이름은 Auth 메타데이터에서 가져오기
      const userName = user.user_metadata?.name || 
                      user.user_metadata?.full_name || 
                      user.user_metadata?.preferred_username || 
                      user.user_metadata?.user_name || 
                      user.email?.split('@')[0] || 
                      '사용자';

      // 캐시 우선 표시
      const cacheKey = `birth_info_${user.id}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (cachedData) {
        const parsedCache = JSON.parse(cachedData);
        const cachedName = parsedCache.name || userName;
        // 이름이 "여행객"일 경우 모든 값을 빈 값으로 초기화
        let initialData;
        if (cachedName === '여행객') {
          initialData = {
            name: '',
            birthYear: '',
            birthMonth: '',
            birthDay: '',
            birthHour: '',
            birthMinute: '',
            gender: '',
            calendarType: '',
            isLeapMonth: false,
            timeUnknown: false,
          };
        } else {
          initialData = {
            name: cachedName,
            birthYear: parsedCache.year?.toString() || '',
            birthMonth: parsedCache.month?.toString() || '',
            birthDay: parsedCache.day?.toString() || '',
            birthHour: parsedCache.hour?.toString() || '',
            birthMinute: parsedCache.minute?.toString() || '',
            gender: parsedCache.gender === 'male' ? '남성' : parsedCache.gender === 'female' ? '여성' : '',
            calendarType: parsedCache.calendar_type === 'lunar' ? '음력' : parsedCache.calendar_type === 'solar' ? '양력' : '',
            isLeapMonth: parsedCache.is_leap_month || false,
            timeUnknown: parsedCache.is_time_unknown || false,
          };
        }
        setSajuInfo(initialData);
        setOriginalSajuInfo(initialData);
        setLoading(false);
      }

      // 백그라운드에서 최신 데이터 가져오기
      const { data: birthData, error: birthError } = await supabase
        .from('birth_info')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (birthError && birthError.code !== 'PGRST116') {
        throw birthError;
      }

      if (birthData) {
        // 캐시 업데이트
        await AsyncStorage.setItem(cacheKey, JSON.stringify(birthData));
        
        const finalName = birthData.name || userName;
        // 이름이 "여행객"일 경우 모든 값을 빈 값으로 초기화
        let finalData;
        if (finalName === '여행객') {
          finalData = {
            name: '',
            birthYear: '',
            birthMonth: '',
            birthDay: '',
            birthHour: '',
            birthMinute: '',
            gender: '',
            calendarType: '',
            isLeapMonth: false,
            timeUnknown: false,
          };
        } else {
          // 데이터베이스에서 가져온 정보로 상태 업데이트
          finalData = {
            name: finalName,
            birthYear: birthData.year?.toString() || '',
            birthMonth: birthData.month?.toString() || '',
            birthDay: birthData.day?.toString() || '',
            birthHour: birthData.hour?.toString() || '',
            birthMinute: birthData.minute?.toString() || '',
            gender: birthData.gender === 'male' ? '남성' : birthData.gender === 'female' ? '여성' : '',
            calendarType: birthData.calendar_type === 'lunar' ? '음력' : birthData.calendar_type === 'solar' ? '양력' : '',
            isLeapMonth: birthData.is_leap_month || false,
            timeUnknown: birthData.is_time_unknown || false,
          };
        }
        setSajuInfo(finalData);
        setOriginalSajuInfo(finalData);
      } else {
        // 데이터가 없으면 이름 확인 후 설정
        let defaultData;
        if (userName === '여행객') {
          // 이름이 "여행객"이면 모든 값을 빈 값으로 초기화
          defaultData = {
            name: '',
            birthYear: '',
            birthMonth: '',
            birthDay: '',
            birthHour: '',
            birthMinute: '',
            gender: '',
            calendarType: '',
            isLeapMonth: false,
            timeUnknown: false,
          };
        } else {
          // 기본값 설정
          defaultData = {
            name: userName,
            birthYear: '',
            birthMonth: '',
            birthDay: '',
            birthHour: '',
            birthMinute: '',
            gender: '',
            calendarType: '',
            isLeapMonth: false,
            timeUnknown: true,
          };
        }
        setSajuInfo(defaultData);
        setOriginalSajuInfo(defaultData);
      }
    } catch (error) {
      console.error('Error loading user birth info:', error);
      Alert.alert('오류', '사주 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showDatePicker) {
      const yearIndex = parseInt(sajuInfo.birthYear) - 1924;
      const yearOffset = yearIndex * 56;
      
      setTimeout(() => {
        yearScrollRef.current?.scrollTo({ y: yearOffset, animated: false });
        monthScrollRef.current?.scrollTo({ y: (parseInt(sajuInfo.birthMonth) - 1) * 56, animated: false });
        dayScrollRef.current?.scrollTo({ y: (parseInt(sajuInfo.birthDay) - 1) * 56, animated: false });
      }, 100);
    }
  }, [showDatePicker]);

  useEffect(() => {
    if (showTimePicker) {
      const hourOffset = parseInt(sajuInfo.birthHour) * 56;
      const minuteOffset = parseInt(sajuInfo.birthMinute) * 56;
      
      setTimeout(() => {
        hourScrollRef.current?.scrollTo({ y: hourOffset, animated: false });
        minuteScrollRef.current?.scrollTo({ y: minuteOffset, animated: false });
      }, 100);
    }
  }, [showTimePicker]);

  const handleSave = async () => {
    if (!userId) {
      Alert.alert('오류', '사용자 정보를 찾을 수 없습니다.');
      return;
    }

    if (!sajuInfo.name.trim()) {
      Alert.alert('오류', '이름을 입력해주세요.');
      return;
    }

    if (!sajuInfo.birthYear || !sajuInfo.birthMonth || !sajuInfo.birthDay) {
      Alert.alert('오류', '생년월일을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);

      // 사주 재계산
      const sajuResult = calculateSaju({
        year: parseInt(sajuInfo.birthYear),
        month: parseInt(sajuInfo.birthMonth),
        day: parseInt(sajuInfo.birthDay),
        hour: sajuInfo.timeUnknown || !sajuInfo.birthHour ? 0 : parseInt(sajuInfo.birthHour),
        minute: sajuInfo.timeUnknown || !sajuInfo.birthMinute ? 0 : parseInt(sajuInfo.birthMinute),
        isLunar: sajuInfo.calendarType === '음력',
        isLeapMonth: sajuInfo.isLeapMonth,
      });

      const birthInfoData = {
        user_id: userId,
        name: sajuInfo.name.trim(),
        year: parseInt(sajuInfo.birthYear),
        month: parseInt(sajuInfo.birthMonth),
        day: parseInt(sajuInfo.birthDay),
        hour: sajuInfo.timeUnknown || !sajuInfo.birthHour ? null : parseInt(sajuInfo.birthHour),
        minute: sajuInfo.timeUnknown || !sajuInfo.birthMinute ? null : parseInt(sajuInfo.birthMinute),
        is_time_unknown: sajuInfo.timeUnknown,
        calendar_type: sajuInfo.calendarType === '음력' ? 'lunar' : sajuInfo.calendarType === '양력' ? 'solar' : null,
        is_leap_month: sajuInfo.isLeapMonth,
        gender: sajuInfo.gender === '남성' ? 'male' : sajuInfo.gender === '여성' ? 'female' : null,
      };

      // 기존 데이터 확인 후 업데이트 또는 삽입
      const { data: existingData, error: checkError } = await supabase
        .from('birth_info')
        .select('id')
        .eq('user_id', userId)
        .single();

      let birthInfoId: string;
      let error;
      if (existingData) {
        // 기존 데이터가 있으면 업데이트
        birthInfoId = existingData.id;
        const { error: updateError } = await supabase
          .from('birth_info')
          .update(birthInfoData)
          .eq('user_id', userId);
        error = updateError;
      } else {
        // 기존 데이터가 없으면 삽입
        const { data: insertedData, error: insertError } = await supabase
          .from('birth_info')
          .insert(birthInfoData)
          .select('id')
          .single();
        error = insertError;
        birthInfoId = insertedData?.id;
      }

      if (error || !birthInfoId) throw error;

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
        throw new Error('사주 데이터 저장에 실패했습니다.');
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

      // 로컬 birth_info 캐시 업데이트
      const cacheKey = `birth_info_${userId}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(birthInfoData));

      Alert.alert('저장 완료', '사주 정보가 저장되었습니다.');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving birth info:', error);
      Alert.alert('오류', '사주 정보 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSajuInfo(originalSajuInfo);
    setIsEditing(false);
  };

  const handleTimeUnknownToggle = () => {
    if (!sajuInfo.timeUnknown) {
      setSajuInfo({
        ...sajuInfo, 
        timeUnknown: true,
        birthHour: '',
        birthMinute: ''
      });
    } else {
      setSajuInfo({
        ...sajuInfo, 
        timeUnknown: false,
        birthHour: '14',
        birthMinute: '30'
      });
    }
  };

  const handleDateSelect = (year: string, month: string, day: string) => {
    setSajuInfo({
      ...sajuInfo,
      birthYear: year,
      birthMonth: month,
      birthDay: day,
    });
  };

  const handleTimeSelect = (hour: string, minute: string) => {
    setSajuInfo({
      ...sajuInfo,
      birthHour: hour,
      birthMinute: minute,
    });
  };

  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 24 : 0;
  const headerTopPadding = statusBarHeight + (IS_IPAD ? 10 : 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { paddingTop: headerTopPadding }]}>
          <TouchableOpacity onPress={() => safeGoBack(navigation)} style={styles.backButton}>
            <Icon name="arrow-back" size={IS_IPAD ? 28 : 24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>사주 정보 관리</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <SabaLoader message="사주 정보를 불러오는 중" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { paddingTop: headerTopPadding }]}>
          <TouchableOpacity onPress={() => safeGoBack(navigation)} style={styles.backButton}>
            <Icon name="arrow-back" size={IS_IPAD ? 28 : 24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>정보 관리</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.infoCard}>
          {!isEditing && (
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>유저 정보</Text>
              <TouchableOpacity onPress={() => {
                setOriginalSajuInfo(sajuInfo);
                setIsEditing(true);
              }} style={styles.editButton}>
                <Text style={styles.editButtonText}>수정</Text>
              </TouchableOpacity>
            </View>
          )}

          {isEditing ? (
            <View style={styles.editContainer}>
              <View style={styles.editContent}>
                <View style={styles.editHeader}>
                  <Text style={styles.editTitle}>정보 수정</Text>
                  <Text style={styles.editSubtitle}>
                    사바세계 탐험을 위해 정보를 입력 해주세요
                  </Text>
                </View>
                <BirthInfoForm
                  data={{
                    name: sajuInfo.name,
                    birthYear: sajuInfo.birthYear,
                    birthMonth: sajuInfo.birthMonth,
                    birthDay: sajuInfo.birthDay,
                    birthHour: sajuInfo.birthHour,
                    birthMinute: sajuInfo.birthMinute,
                    gender: sajuInfo.gender as '남성' | '여성' | '',
                    calendarType: sajuInfo.calendarType as '양력' | '음력' | '',
                    isLeapMonth: sajuInfo.isLeapMonth,
                    isTimeUnknown: sajuInfo.timeUnknown,
                  }}
                  onChange={(field, value) => {
                    // 필드명 매핑: isTimeUnknown -> timeUnknown
                    const mappedField = field === 'isTimeUnknown' ? 'timeUnknown' : field;
                    setSajuInfo(prev => ({ ...prev, [mappedField]: value }));
                  }}
                  showName={true}
                />
              </View>
              <View style={styles.buttonContainer}>
                <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                  <Text style={styles.saveButtonText}>저장</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.infoListContainer}>
              <View style={styles.infoCardItem}>
                <Text style={styles.infoLabel}>이름</Text>
                <Text style={styles.infoValue}>
                  {sajuInfo.name || '여행객'}
                </Text>
              </View>

              <View style={styles.infoCardItem}>
                <Text style={styles.infoLabel}>생년월일</Text>
                <Text style={[
                  styles.infoValue,
                  (!sajuInfo.birthYear || !sajuInfo.birthMonth || !sajuInfo.birthDay) && styles.infoValueEmpty
                ]}>
                  {sajuInfo.birthYear && sajuInfo.birthMonth && sajuInfo.birthDay
                    ? `${sajuInfo.birthYear}년 ${sajuInfo.birthMonth}월 ${sajuInfo.birthDay}일`
                    : '입력 필요'}
                </Text>
              </View>

              <View style={styles.infoCardItem}>
                <Text style={styles.infoLabel}>성별</Text>
                <Text style={[
                  styles.infoValue,
                  !sajuInfo.gender && styles.infoValueEmpty
                ]}>
                  {sajuInfo.gender || '입력 필요'}
                </Text>
              </View>

              <View style={styles.infoCardItem}>
                <Text style={styles.infoLabel}>음/양력</Text>
                <Text style={[
                  styles.infoValue,
                  !sajuInfo.calendarType && styles.infoValueEmpty
                ]}>
                  {sajuInfo.calendarType || '입력 필요'}
                </Text>
              </View>

              {sajuInfo.calendarType === '음력' && (
                <View style={styles.infoCardItem}>
                  <Text style={styles.infoLabel}>윤달</Text>
                  <Text style={styles.infoValue}>
                    {sajuInfo.isLeapMonth ? '네' : '아니오'}
                  </Text>
                </View>
              )}

              <View style={styles.infoCardItem}>
                <Text style={styles.infoLabel}>태어난 시간</Text>
                <Text style={[
                  styles.infoValue,
                  (sajuInfo.timeUnknown || !sajuInfo.birthHour || !sajuInfo.birthMinute) && styles.infoValueEmpty
                ]}>
                  {sajuInfo.timeUnknown || !sajuInfo.birthHour || !sajuInfo.birthMinute
                    ? '입력 필요'
                    : `${sajuInfo.birthHour}시 ${sajuInfo.birthMinute}분`}
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>생년월일 선택</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.pickerContainer}>
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>년</Text>
                <ScrollView 
                  ref={yearScrollRef}
                  style={styles.pickerScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {Array.from({length: 100}, (_, i) => 1924 + i).map(year => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.pickerItem,
                        sajuInfo.birthYear === year.toString() && styles.pickerItemSelected
                      ]}
                      onPress={() => handleDateSelect(year.toString(), sajuInfo.birthMonth, sajuInfo.birthDay)}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        sajuInfo.birthYear === year.toString() && styles.pickerItemTextSelected
                      ]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>월</Text>
                <ScrollView 
                  ref={monthScrollRef}
                  style={styles.pickerScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {Array.from({length: 12}, (_, i) => i + 1).map(month => (
                    <TouchableOpacity
                      key={month}
                      style={[
                        styles.pickerItem,
                        sajuInfo.birthMonth === month.toString() && styles.pickerItemSelected
                      ]}
                      onPress={() => handleDateSelect(sajuInfo.birthYear, month.toString(), sajuInfo.birthDay)}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        sajuInfo.birthMonth === month.toString() && styles.pickerItemTextSelected
                      ]}>
                        {month}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>일</Text>
                <ScrollView 
                  ref={dayScrollRef}
                  style={styles.pickerScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {Array.from({length: 31}, (_, i) => i + 1).map(day => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.pickerItem,
                        sajuInfo.birthDay === day.toString() && styles.pickerItemSelected
                      ]}
                      onPress={() => handleDateSelect(sajuInfo.birthYear, sajuInfo.birthMonth, day.toString())}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        sajuInfo.birthDay === day.toString() && styles.pickerItemTextSelected
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.modalButtonText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showTimePicker}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>시간 선택</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.pickerContainer}>
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>시</Text>
                <ScrollView 
                  ref={hourScrollRef}
                  style={styles.pickerScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {Array.from({length: 24}, (_, i) => i).map(hour => (
                    <TouchableOpacity
                      key={hour}
                      style={[
                        styles.pickerItem,
                        sajuInfo.birthHour === hour.toString() && styles.pickerItemSelected
                      ]}
                      onPress={() => handleTimeSelect(hour.toString(), sajuInfo.birthMinute)}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        sajuInfo.birthHour === hour.toString() && styles.pickerItemTextSelected
                      ]}>
                        {hour}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>분</Text>
                <ScrollView 
                  ref={minuteScrollRef}
                  style={styles.pickerScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {Array.from({length: 60}, (_, i) => i).map(minute => (
                    <TouchableOpacity
                      key={minute}
                      style={[
                        styles.pickerItem,
                        sajuInfo.birthMinute === minute.toString() && styles.pickerItemSelected
                      ]}
                      onPress={() => handleTimeSelect(sajuInfo.birthHour, minute.toString())}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        sajuInfo.birthMinute === minute.toString() && styles.pickerItemTextSelected
                      ]}>
                        {minute}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => setShowTimePicker(false)}
            >
              <Text style={styles.modalButtonText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: IS_IPAD ? 30 : 20,
    paddingBottom: IS_IPAD ? 20 : 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: IS_IPAD ? 12 : 8,
  },
  headerTitle: {
    fontSize: IS_IPAD ? 24 : 18,
    fontWeight: '600',
    color: '#333',
  },
  headerRight: {
    width: IS_IPAD ? 56 : 40,
  },
  infoCard: {
    padding: IS_IPAD ? 30 : 20,
    paddingHorizontal: IS_IPAD ? 40 : 25,
  },
  editContainer: {
    paddingTop: 0,
    minHeight: IS_IPAD ? 900 : 600,
    justifyContent: 'space-between',
  },
  editContent: {
    flexGrow: 1,
  },
  editHeader: {
    marginTop: 4,
    marginBottom: IS_IPAD ? 36 : 28,
    alignItems: 'center',
  },
  editTitle: {
    fontSize: IS_IPAD ? 28 : 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: IS_IPAD ? 8 : 4,
    textAlign: 'center',
  },
  editSubtitle: {
    fontSize: IS_IPAD ? 18 : 14,
    color: '#6b7280',
    lineHeight: IS_IPAD ? 28 : 20,
    textAlign: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: IS_IPAD ? 28 : 20,
  },
  cardTitle: {
    fontSize: IS_IPAD ? 24 : 18,
    fontWeight: '600',
    color: '#333',
  },
  editButton: {
    backgroundColor: Colors.primaryColor,
    paddingHorizontal: IS_IPAD ? 24 : 16,
    paddingVertical: IS_IPAD ? 12 : 8,
    borderRadius: IS_IPAD ? 24 : 20,
  },
  editButtonText: {
    color: 'white',
    fontSize: IS_IPAD ? 18 : 14,
    fontWeight: '600',
  },
  infoListContainer: {
    gap: IS_IPAD ? 14 : 10,
  },
  infoCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingHorizontal: IS_IPAD ? 26 : 18,
    paddingVertical: IS_IPAD ? 22 : 16,
    borderRadius: IS_IPAD ? 20 : 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: IS_IPAD ? 16 : 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: IS_IPAD ? 18 : 14,
    color: '#8e8e93',
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  infoValue: {
    fontSize: IS_IPAD ? 20 : 16,
    color: '#1d1d1f',
    fontWeight: '400',
    letterSpacing: -0.3,
  },
  infoValueEmpty: {
    color: '#c7c7cc',
    fontStyle: 'normal',
    fontWeight: '400',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
  },
  genderButtonActive: {
    backgroundColor: Colors.primaryColor,
    borderColor: Colors.primaryColor,
  },
  genderButtonText: {
    fontSize: 14,
    color: '#666',
  },
  genderButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  calendarContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  calendarButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
  },
  calendarButtonActive: {
    backgroundColor: Colors.primaryColor,
    borderColor: Colors.primaryColor,
  },
  calendarButtonText: {
    fontSize: 14,
    color: '#666',
  },
  calendarButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  leapMonthContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  leapMonthButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
  },
  leapMonthButtonActive: {
    backgroundColor: Colors.primaryColor,
    borderColor: Colors.primaryColor,
  },
  leapMonthButtonText: {
    fontSize: 14,
    color: '#666',
  },
  leapMonthButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.primaryColor,
    borderColor: Colors.primaryColor,
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  timeSection: {
    flex: 1,
  },
  timeUnknownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  timeUnknownText: {
    fontSize: 16,
    color: '#333',
  },
  dateSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  dateSelectorText: {
    fontSize: 16,
    color: '#333',
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
    minWidth: 120,
  },
  timeSelectorText: {
    fontSize: 16,
    color: '#333',
  },
  timeDisabledText: {
    fontSize: 16,
    color: '#999',
  },
  arrowIcon: {
    fontSize: 18,
    color: '#ccc',
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: IS_IPAD ? 60 : 50,
    gap: IS_IPAD ? 16 : 12,
    paddingBottom: IS_IPAD ? 40 : 30,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: IS_IPAD ? 18 : 12,
    borderRadius: IS_IPAD ? 12 : 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: IS_IPAD ? 20 : 16,
    color: '#666',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: IS_IPAD ? 18 : 12,
    borderRadius: IS_IPAD ? 12 : 8,
    backgroundColor: Colors.primaryColor,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: IS_IPAD ? 20 : 16,
    color: 'white',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: IS_IPAD ? 24 : 16,
    padding: IS_IPAD ? 30 : 20,
    width: IS_IPAD ? '70%' : '90%',
    maxWidth: IS_IPAD ? 600 : '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: IS_IPAD ? 28 : 20,
  },
  modalTitle: {
    fontSize: IS_IPAD ? 24 : 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    width: IS_IPAD ? 40 : 32,
    height: IS_IPAD ? 40 : 32,
    borderRadius: IS_IPAD ? 20 : 16,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: IS_IPAD ? 24 : 18,
    color: '#666',
    fontWeight: 'bold',
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: IS_IPAD ? 28 : 20,
  },
  pickerColumn: {
    alignItems: 'center',
    flex: 1,
  },
  pickerLabel: {
    fontSize: IS_IPAD ? 20 : 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: IS_IPAD ? 14 : 10,
  },
  pickerScroll: {
    maxHeight: IS_IPAD ? 280 : 200,
  },
  pickerItem: {
    paddingVertical: IS_IPAD ? 16 : 12,
    paddingHorizontal: IS_IPAD ? 20 : 16,
    borderRadius: IS_IPAD ? 12 : 8,
    marginVertical: IS_IPAD ? 6 : 4,
    minWidth: IS_IPAD ? 80 : 60,
    alignItems: 'center',
    height: IS_IPAD ? 64 : 48,
  },
  pickerItemSelected: {
    backgroundColor: Colors.primaryColor,
  },
  pickerItemText: {
    fontSize: IS_IPAD ? 20 : 16,
    color: '#333',
  },
  pickerItemTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  modalButton: {
    backgroundColor: Colors.primaryColor,
    paddingVertical: IS_IPAD ? 18 : 12,
    borderRadius: IS_IPAD ? 12 : 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: IS_IPAD ? 20 : 16,
    fontWeight: '600',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
});

export default SajuInfoScreen;
