import React, { useState } from 'react';
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
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveBirthInfo = async () => {
    if (!birthYear || !birthMonth || !birthDay || !birthHour || !birthMinute) {
      Alert.alert('오류', '생년월일시분을 모두 입력해주세요.');
      return;
    }

    // 유효성 검사
    const year = parseInt(birthYear);
    const month = parseInt(birthMonth);
    const day = parseInt(birthDay);
    const hour = parseInt(birthHour);
    const minute = parseInt(birthMinute);

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

    if (hour < 0 || hour > 23) {
      Alert.alert('오류', '올바른 시간을 입력해주세요.');
      return;
    }

    if (minute < 0 || minute > 59) {
      Alert.alert('오류', '올바른 분을 입력해주세요.');
      return;
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
        <Text style={styles.title}>생년월일 정보 입력</Text>
        <Text style={styles.subtitle}>사주 분석을 위해 생년월일 정보가 필요합니다.</Text>

        <View style={styles.dateRow}>
          <View style={styles.dateInputContainer}>
            <Text style={styles.label}>년도 *</Text>
            <TextInput
              style={styles.input}
              placeholder="1990"
              value={birthYear}
              onChangeText={setBirthYear}
              keyboardType="numeric"
              maxLength={4}
            />
          </View>
          
          <View style={styles.dateInputContainer}>
            <Text style={styles.label}>월 *</Text>
            <TextInput
              style={styles.input}
              placeholder="01"
              value={birthMonth}
              onChangeText={setBirthMonth}
              keyboardType="numeric"
              maxLength={2}
            />
          </View>
          
          <View style={styles.dateInputContainer}>
            <Text style={styles.label}>일 *</Text>
            <TextInput
              style={styles.input}
              placeholder="01"
              value={birthDay}
              onChangeText={setBirthDay}
              keyboardType="numeric"
              maxLength={2}
            />
          </View>
        </View>

        <View style={styles.timeRow}>
          <View style={styles.timeInputContainer}>
            <Text style={styles.label}>시간 *</Text>
            <TextInput
              style={styles.input}
              placeholder="14"
              value={birthHour}
              onChangeText={setBirthHour}
              keyboardType="numeric"
              maxLength={2}
            />
          </View>
          
          <View style={styles.timeInputContainer}>
            <Text style={styles.label}>분 *</Text>
            <TextInput
              style={styles.input}
              placeholder="30"
              value={birthMinute}
              onChangeText={setBirthMinute}
              keyboardType="numeric"
              maxLength={2}
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>달력 종류 *</Text>
          <View style={styles.radioContainer}>
            <TouchableOpacity 
              style={[styles.radioButton, calendarType === 'solar' && styles.radioButtonSelected]}
              onPress={() => setCalendarType('solar')}
            >
              <Text style={[styles.radioText, calendarType === 'solar' && styles.radioTextSelected]}>
                양력
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.radioButton, calendarType === 'lunar' && styles.radioButtonSelected]}
              onPress={() => setCalendarType('lunar')}
            >
              <Text style={[styles.radioText, calendarType === 'lunar' && styles.radioTextSelected]}>
                음력
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {calendarType === 'lunar' && (
          <View style={styles.inputContainer}>
            <TouchableOpacity 
              style={styles.checkboxContainer}
              onPress={() => setIsLeapMonth(!isLeapMonth)}
            >
              <View style={[styles.checkbox, isLeapMonth && styles.checkboxSelected]}>
                {isLeapMonth && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>윤달 여부</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.saveButton, isLoading && styles.disabledButton]}
          onPress={handleSaveBirthInfo}
          disabled={isLoading}
        >
          <Text style={styles.saveButtonText}>
            {isLoading ? '저장 중...' : '저장하기'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.skipButton}
          onPress={() => navigation.replace('MainTabs')}
        >
          <Text style={styles.skipButtonText}>나중에 입력하기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  inputContainer: {
    marginBottom: 20,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dateInputContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  timeInputContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  radioContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  radioButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
    minWidth: 100,
    alignItems: 'center',
  },
  radioButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
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
    marginTop: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 10,
  },
  disabledButton: {
    backgroundColor: '#ccc',
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
