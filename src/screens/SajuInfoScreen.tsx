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
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../constants/colors';
import { supabase } from '../utils/supabaseClient';
import { calculateSaju } from '../utils/saju/ganji_local';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        Alert.alert('오류', '로그인이 필요합니다.');
        navigation.goBack();
        return;
      }

      setUserId(user.id);

      // 사용자 이름은 Auth 메타데이터에서 가져오기 (카카오 데이터 우선순위)
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
        setSajuInfo({
          name: parsedCache.name || userName,
          birthYear: parsedCache.year?.toString() || '',
          birthMonth: parsedCache.month?.toString() || '',
          birthDay: parsedCache.day?.toString() || '',
          birthHour: parsedCache.hour?.toString() || '0',
          birthMinute: parsedCache.minute?.toString() || '0',
          gender: parsedCache.gender === 'male' ? '남성' : '여성',
          calendarType: parsedCache.calendar_type === 'lunar' ? '음력' : '양력',
          isLeapMonth: parsedCache.is_leap_month || false,
          timeUnknown: parsedCache.is_time_unknown || false,
        });
        setLoading(false);
      }

      // 백그라운드에서 최신 데이터 가져오기
      const { data: birthData, error: birthError } = await supabase
        .from('birth_infos')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (birthError && birthError.code !== 'PGRST116') {
        throw birthError;
      }

      if (birthData) {
        // 캐시 업데이트
        await AsyncStorage.setItem(cacheKey, JSON.stringify(birthData));
        
        // 데이터베이스에서 가져온 정보로 상태 업데이트
        setSajuInfo({
          name: birthData.name || userName,
          birthYear: birthData.year?.toString() || '',
          birthMonth: birthData.month?.toString() || '',
          birthDay: birthData.day?.toString() || '',
          birthHour: birthData.hour?.toString() || '0',
          birthMinute: birthData.minute?.toString() || '0',
          gender: birthData.gender === 'male' ? '남성' : '여성',
          calendarType: birthData.calendar_type === 'lunar' ? '음력' : '양력',
          isLeapMonth: birthData.is_leap_month || false,
          timeUnknown: birthData.is_time_unknown || false,
        });
      } else {
        // 데이터가 없으면 기본값 설정
        const defaultData = {
          name: userName,
          birthYear: '1990',
          birthMonth: '1',
          birthDay: '1',
          birthHour: '0',
          birthMinute: '0',
          gender: '남성',
          calendarType: '양력',
          isLeapMonth: false,
          timeUnknown: true,
        };
        setSajuInfo(defaultData);
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
        hour: sajuInfo.timeUnknown ? 0 : parseInt(sajuInfo.birthHour),
        minute: sajuInfo.timeUnknown ? 0 : parseInt(sajuInfo.birthMinute),
        isLunar: sajuInfo.calendarType === '음력',
        isLeapMonth: sajuInfo.isLeapMonth,
      });

      const birthInfoData = {
        user_id: userId,
        name: sajuInfo.name.trim(),
        year: parseInt(sajuInfo.birthYear),
        month: parseInt(sajuInfo.birthMonth),
        day: parseInt(sajuInfo.birthDay),
        hour: sajuInfo.timeUnknown ? null : parseInt(sajuInfo.birthHour),
        minute: sajuInfo.timeUnknown ? null : parseInt(sajuInfo.birthMinute),
        is_time_unknown: sajuInfo.timeUnknown,
        calendar_type: sajuInfo.calendarType === '음력' ? 'lunar' : 'solar',
        is_leap_month: sajuInfo.isLeapMonth,
        gender: sajuInfo.gender === '남성' ? 'male' : 'female',
        saju_data: sajuResult,  // 재계산된 사주 데이터 저장
      };

      // 기존 데이터 확인 후 업데이트 또는 삽입
      const { data: existingData, error: checkError } = await supabase
        .from('birth_infos')
        .select('id')
        .eq('user_id', userId)
        .single();

      let error;
      if (existingData) {
        // 기존 데이터가 있으면 업데이트
        const { error: updateError } = await supabase
          .from('birth_infos')
          .update(birthInfoData)
          .eq('user_id', userId);
        error = updateError;
      } else {
        // 기존 데이터가 없으면 삽입
        const { error: insertError } = await supabase
          .from('birth_infos')
          .insert(birthInfoData);
        error = insertError;
      }

      if (error) throw error;

      // 캐시 업데이트
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
    setIsEditing(false);
  };

  const handleTimeUnknownToggle = () => {
    if (!sajuInfo.timeUnknown) {
      setSajuInfo({
        ...sajuInfo, 
        timeUnknown: true,
        birthHour: '0',
        birthMinute: '0'
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>사주 정보 관리</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primaryColor} />
          <Text style={styles.loadingText}>사주 정보를 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>사주 정보 관리</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>정보</Text>
            {!isEditing && (
              <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editButton}>
                <Text style={styles.editButtonText}>수정</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>이름</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={sajuInfo.name}
                onChangeText={(text) => {
                  // 한글, 영문만 허용 (숫자, 특수문자 제거) - 한글 조합 문자도 포함
                  const filteredText = text.replace(/[^ㄱ-ㅎㅏ-ㅣ가-힣a-zA-Z\s]/g, '');
                  setSajuInfo({...sajuInfo, name: filteredText});
                }}
                placeholder="이름을 입력하세요"
                maxLength={10}
              />
            ) : (
              <Text style={styles.infoValue}>{sajuInfo.name}</Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>생년월일</Text>
            {isEditing ? (
              <TouchableOpacity 
                style={styles.dateSelector}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateSelectorText}>
                  {sajuInfo.birthYear}년 {sajuInfo.birthMonth}월 {sajuInfo.birthDay}일
                </Text>
                <Text style={styles.arrowIcon}>›</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.infoValue}>
                {sajuInfo.birthYear}년 {sajuInfo.birthMonth}월 {sajuInfo.birthDay}일
              </Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>성별</Text>
            {isEditing ? (
              <View style={styles.genderContainer}>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    sajuInfo.gender === '남성' && styles.genderButtonActive
                  ]}
                  onPress={() => setSajuInfo({...sajuInfo, gender: '남성'})}
                >
                  <Text style={[
                    styles.genderButtonText,
                    sajuInfo.gender === '남성' && styles.genderButtonTextActive
                  ]}>남성</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    sajuInfo.gender === '여성' && styles.genderButtonActive
                  ]}
                  onPress={() => setSajuInfo({...sajuInfo, gender: '여성'})}
                >
                  <Text style={[
                    styles.genderButtonText,
                    sajuInfo.gender === '여성' && styles.genderButtonTextActive
                  ]}>여성</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.infoValue}>{sajuInfo.gender}</Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>음/양력</Text>
            {isEditing ? (
              <View style={styles.calendarContainer}>
                <TouchableOpacity
                  style={[
                    styles.calendarButton,
                    sajuInfo.calendarType === '양력' && styles.calendarButtonActive
                  ]}
                  onPress={() => setSajuInfo({...sajuInfo, calendarType: '양력'})}
                >
                  <Text style={[
                    styles.calendarButtonText,
                    sajuInfo.calendarType === '양력' && styles.calendarButtonTextActive
                  ]}>양력</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.calendarButton,
                    sajuInfo.calendarType === '음력' && styles.calendarButtonActive
                  ]}
                  onPress={() => setSajuInfo({...sajuInfo, calendarType: '음력'})}
                >
                  <Text style={[
                    styles.calendarButtonText,
                    sajuInfo.calendarType === '음력' && styles.calendarButtonTextActive
                  ]}>음력</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.infoValue}>{sajuInfo.calendarType}</Text>
            )}
          </View>

          {sajuInfo.calendarType === '음력' && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>윤달</Text>
              {isEditing ? (
                <View style={styles.leapMonthContainer}>
                  <TouchableOpacity
                    style={[
                      styles.leapMonthButton,
                      !sajuInfo.isLeapMonth && styles.leapMonthButtonActive
                    ]}
                    onPress={() => setSajuInfo({...sajuInfo, isLeapMonth: false})}
                  >
                    <Text style={[
                      styles.leapMonthButtonText,
                      !sajuInfo.isLeapMonth && styles.leapMonthButtonTextActive
                    ]}>아니오</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.leapMonthButton,
                      sajuInfo.isLeapMonth && styles.leapMonthButtonActive
                    ]}
                    onPress={() => setSajuInfo({...sajuInfo, isLeapMonth: true})}
                  >
                    <Text style={[
                      styles.leapMonthButtonText,
                      sajuInfo.isLeapMonth && styles.leapMonthButtonTextActive
                    ]}>네</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.infoValue}>
                  {sajuInfo.isLeapMonth ? '네' : '아니오'}
                </Text>
              )}
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>태어난 시간</Text>
            {isEditing ? (
              <View style={styles.timeSection}>
                <TouchableOpacity
                  style={styles.timeUnknownContainer}
                  onPress={handleTimeUnknownToggle}
                >
                  <View style={[
                    styles.checkbox,
                    sajuInfo.timeUnknown && styles.checkboxActive
                  ]}>
                    {sajuInfo.timeUnknown && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.timeUnknownText}>시간을 모릅니다</Text>
                </TouchableOpacity>
                
                {!sajuInfo.timeUnknown && (
                  <View style={styles.timeContainer}>
                    <TouchableOpacity 
                      style={styles.timeSelector}
                      onPress={() => setShowTimePicker(true)}
                    >
                      <Text style={styles.timeSelectorText}>
                        {sajuInfo.birthHour}시 {sajuInfo.birthMinute}분
                      </Text>
                      <Text style={styles.arrowIcon}>›</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {sajuInfo.timeUnknown && (
                  <View style={styles.timeContainer}>
                    <Text style={styles.timeDisabledText}>0시 0분</Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.infoValue}>
                {sajuInfo.timeUnknown ? '시간 모름' : `${sajuInfo.birthHour}시 ${sajuInfo.birthMinute}분`}
              </Text>
            )}
          </View>

          {isEditing && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                <Text style={styles.saveButtonText}>저장</Text>
              </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: Colors.primaryColor,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerRight: {
    width: 40,
  },
  infoCard: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  editButton: {
    backgroundColor: Colors.primaryColor,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    width: 80,
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
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
    fontStyle: 'italic',
  },
  arrowIcon: {
    fontSize: 18,
    color: '#ccc',
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.primaryColor,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
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
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  pickerColumn: {
    alignItems: 'center',
    flex: 1,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  pickerScroll: {
    maxHeight: 200,
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 4,
    minWidth: 60,
    alignItems: 'center',
    height: 48,
  },
  pickerItemSelected: {
    backgroundColor: Colors.primaryColor,
  },
  pickerItemText: {
    fontSize: 16,
    color: '#333',
  },
  pickerItemTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  modalButton: {
    backgroundColor: Colors.primaryColor,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

export default SajuInfoScreen;
