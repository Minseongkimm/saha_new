import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { supabase } from '../utils/supabaseClient';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { Colors } from '../constants/colors';

interface BirthInfoScreenProps {
  navigation: {
    replace: (screenName: string) => void;
  };
  route: RouteProp<RootStackParamList, 'BirthInfo'>;
}

function BirthInfoScreen({ navigation, route }: BirthInfoScreenProps) {
  const { userId } = route.params;
  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthHour, setBirthHour] = useState('');
  const [birthMinute, setBirthMinute] = useState('');
  const [calendarType, setCalendarType] = useState('solar'); // 'solar' 또는 'lunar'
  const [isLeapMonth, setIsLeapMonth] = useState(false);

  // 음력 선택 시 평달을 기본값으로 설정
  useEffect(() => {
    if (calendarType === 'lunar') {
      setIsLeapMonth(false);
    }
  }, [calendarType]);
  const [isTimeUnknown, setIsTimeUnknown] = useState(false); // 시간 모름 옵션
  const [gender, setGender] = useState(''); // 'male' 또는 'female'
  const [isLoading, setIsLoading] = useState(false);
  

  const handleSaveBirthInfo = async () => {
    if (!birthYear || !birthMonth || !birthDay) {
      Alert.alert('오류', '생년월일을 모두 입력해주세요.');
      return;
    }

    if (!gender) {
      Alert.alert('오류', '성별을 선택해주세요.');
      return;
    }

    // 시간 모름이 아닌 경우에만 시간 검증
    if (!isTimeUnknown && (!birthHour || !birthMinute)) {
      Alert.alert('오류', '시간을 입력해주세요.');
      return;
    }

    // 유효성 검사
    const year = parseInt(birthYear);
    const month = parseInt(birthMonth);
    const day = parseInt(birthDay);
    const hour = isTimeUnknown ? null : parseInt(birthHour);
    const minute = isTimeUnknown ? null : parseInt(birthMinute);

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

    // 시간 모름이 아닌 경우에만 시간 유효성 검사
    if (!isTimeUnknown && hour !== null && minute !== null) {
      if (hour < 0 || hour > 23) {
        Alert.alert('오류', '올바른 시간을 입력해주세요.');
        return;
      }

      if (minute < 0 || minute > 59) {
        Alert.alert('오류', '올바른 분을 입력해주세요.');
        return;
      }
    }

    setIsLoading(true);

    try {
      console.log('=== 생년월일 정보 저장 시작 ===');
      
      const birthData = {
        user_id: userId,
        year: year,
        month: month,
        day: day,
        hour: hour,
        minute: minute,
        calendar_type: calendarType,
        is_leap_month: isLeapMonth,
        is_time_unknown: isTimeUnknown,
        gender: gender,
      };

      console.log('저장할 생년월일 데이터:', birthData);

      const { data, error } = await supabase
        .from('birth_infos')
        .insert(birthData)
        .select();

      if (error) {
        console.error('생년월일 정보 저장 에러:', error);
        Alert.alert('오류', '생년월일 정보 저장에 실패했습니다.');
      } else {
        console.log('=== 생년월일 정보 저장 성공 ===');
        console.log('저장된 데이터:', data);
        Alert.alert('성공', '생년월일 정보가 저장되었습니다.', [
          { text: '확인', onPress: () => navigation.replace('MainTabs') }
        ]);
      }
    } catch (error) {
      console.error('생년월일 정보 저장 예외:', error);
      Alert.alert('오류', '생년월일 정보 저장에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>사주 정보 입력</Text>
        <Text style={styles.subtitle}>사주 분석을 위해서만 활용됩니다.</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>생년월일</Text>
          <View style={styles.dateInputContainer}>
            <TextInput
              style={styles.dateInput}
              placeholder="1992.02.06"
              value={birthYear || birthMonth || birthDay ? 
                `${birthYear || ''}${birthMonth ? `.${birthMonth}` : ''}${birthDay ? `.${birthDay}` : ''}` 
                : ''
              }
              onChangeText={(text) => {
                // 숫자만 허용
                const cleaned = text.replace(/[^0-9]/g, '');
                
                // 자동으로 점 추가
                let formatted = '';
                if (cleaned.length > 0) formatted += cleaned.slice(0, 4);
                if (cleaned.length > 4) formatted += '.' + cleaned.slice(4, 6);
                if (cleaned.length > 6) formatted += '.' + cleaned.slice(6, 8);
                
                // 각 부분 업데이트
                const parts = formatted.split('.');
                setBirthYear(parts[0] || '');
                setBirthMonth(parts[1] || '');
                setBirthDay(parts[2] || '');
              }}
              keyboardType="number-pad"
              maxLength={10} // YYYY.MM.DD
            />
            {(birthYear || birthMonth || birthDay) && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setBirthYear('');
                  setBirthMonth('');
                  setBirthDay('');
                }}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <View>
            <Text style={styles.label}>달력</Text>
            <View style={styles.calendarTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.calendarTypeButton,
                  calendarType === 'solar' && styles.calendarTypeButtonSelected
                ]}
                onPress={() => setCalendarType('solar')}
              >
                <Text style={[
                  styles.calendarTypeText,
                  calendarType === 'solar' && styles.calendarTypeTextSelected
                ]}>양력</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.calendarTypeButton,
                  calendarType === 'lunar' && styles.calendarTypeButtonSelected
                ]}
                onPress={() => setCalendarType('lunar')}
              >
                <Text style={[
                  styles.calendarTypeText,
                  calendarType === 'lunar' && styles.calendarTypeTextSelected
                ]}>음력</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.label, { marginTop: 22 }]}>윤달 여부(음력 시 선택)</Text>
            <View style={styles.calendarTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.calendarTypeButton,
                  !isLeapMonth && styles.calendarTypeButtonSelected,
                  calendarType === 'solar' && styles.disabledButton
                ]}
                onPress={() => calendarType === 'lunar' && setIsLeapMonth(false)}
                disabled={calendarType === 'solar'}
              >
                <Text style={[
                  styles.calendarTypeText,
                  !isLeapMonth && styles.calendarTypeTextSelected,
                  calendarType === 'solar' && styles.disabledText
                ]}>평달</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.calendarTypeButton,
                  isLeapMonth && styles.calendarTypeButtonSelected,
                  calendarType === 'solar' && styles.disabledButton
                ]}
                onPress={() => calendarType === 'lunar' && setIsLeapMonth(true)}
                disabled={calendarType === 'solar'}
              >
                <Text style={[
                  styles.calendarTypeText,
                  isLeapMonth && styles.calendarTypeTextSelected,
                  calendarType === 'solar' && styles.disabledText
                ]}>윤달</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>


        <View style={styles.inputContainer}>
          <Text style={styles.label}>성별</Text>
          <View style={styles.radioContainer}>
            <TouchableOpacity 
              style={[styles.radioButton, gender === 'male' && styles.radioButtonSelected]}
              onPress={() => setGender('male')}
            >
              <Text style={[styles.radioText, gender === 'male' && styles.radioTextSelected]}>
                남성
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.radioButton, gender === 'female' && styles.radioButtonSelected]}
              onPress={() => setGender('female')}
            >
              <Text style={[styles.radioText, gender === 'female' && styles.radioTextSelected]}>
                여성
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>태어난 시간</Text>
          <View style={styles.timeInputContainer}>
            <TextInput
              style={[styles.timeInput, isTimeUnknown && styles.disabledInput]}
              placeholder="07:40"
              value={birthHour || birthMinute ? 
                `${birthHour || ''}${birthMinute ? `:${birthMinute}` : ''}` 
                : ''
              }
              onChangeText={(text) => {
                if (!isTimeUnknown) {
                  // 숫자만 허용
                  const cleaned = text.replace(/[^0-9]/g, '');
                  
                  // 시간 제한 (0-23)
                  let hour = cleaned.slice(0, 2);
                  if (hour.length === 2) {
                    const hourNum = parseInt(hour);
                    if (hourNum > 23) hour = '23';
                  }

                  // 분 제한 (0-59)
                  let minute = cleaned.slice(2, 4);
                  if (minute.length === 2) {
                    const minuteNum = parseInt(minute);
                    if (minuteNum > 59) minute = '59';
                  }

                  // 자동으로 콜론 추가
                  let formatted = '';
                  if (hour) formatted += hour;
                  if (minute) formatted += ':' + minute;
                  
                  // 각 부분 업데이트
                  setBirthHour(hour || '');
                  setBirthMinute(minute || '');
                }
              }}
              keyboardType="number-pad"
              maxLength={5} // HH:mm
              editable={!isTimeUnknown}
            />
            {!isTimeUnknown && (birthHour || birthMinute) && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setBirthHour('');
                  setBirthMinute('');
                }}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.inputContainer}>
          <TouchableOpacity 
            style={styles.checkboxContainer}
            onPress={() => setIsTimeUnknown(!isTimeUnknown)}
          >
            <View style={[styles.checkbox, isTimeUnknown && styles.checkboxSelected]}>
              {isTimeUnknown && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>시간 몰라요 </Text>
          </TouchableOpacity>
        </View>


        <TouchableOpacity 
          style={[styles.saveButton, isLoading && styles.disabledButton]}
          onPress={handleSaveBirthInfo}
          disabled={isLoading}
        >
          <Text style={styles.saveButtonText}>
            {isLoading ? '저장 중...' : '저장하기'}
          </Text>
        </TouchableOpacity>

        {/* <TouchableOpacity 
          style={styles.skipButton}
          onPress={() => navigation.replace('MainTabs')}
        >
          <Text style={styles.skipButtonText}>나중에 입력하기</Text>
        </TouchableOpacity> */}
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
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
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
  },
  inputContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
  },
  dateInputContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  timeInputContainer: {
    position: 'relative',
    marginBottom: 0,
  },
  dateInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 6,
    paddingRight: 30,
    fontSize: 20,
    color: '#333',
  },
  timeInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 5,
    paddingRight: 30,
    fontSize: 20,
    color: '#333',
  },
  clearButton: {
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: [{ translateY: -12 }],
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 14,
    color: '#666',
  },
  calendarTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop:10,
  },
  calendarTypeButton: {
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
    minWidth: 150,
    minHeight: 45,
    alignItems: 'center',
  },
  calendarTypeButtonSelected: {
    backgroundColor: Colors.primaryColor,
    borderColor: Colors.primaryColor,
  },
  calendarTypeText: {
    fontSize: 16,
    color: '#333',
  },
  calendarTypeTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
    color: '#999',
  },
  disabledText: {
    color: '#999',
  },
  radioContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  radioButton: {
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
    minWidth: 150,
    minHeight: 45,
    alignItems: 'center',
  },
  radioButtonSelected: {
    backgroundColor: Colors.primaryColor,
    borderColor: Colors.primaryColor,
  },
  radioText: {
    fontSize: 16,
    color: '#333',
  },
  radioTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -18,
  },
    checkbox: {
      width: 16,
      height: 16,
      borderWidth: 1.5,
      borderColor: '#ddd',
      borderRadius: 3,
      marginRight: 6,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'white',
    },
    checkboxSelected: {
      backgroundColor: Colors.primaryColor,
      borderColor: Colors.primaryColor,
    },
    checkmark: {
      color: 'white',
      fontSize: 12,
      fontWeight: 'bold',
    },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
  },
  saveButton: {
    backgroundColor: Colors.primaryColor,
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 0,
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
    padding: 16,
  },
  skipButtonText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default BirthInfoScreen;

