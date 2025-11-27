import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Colors } from '../../constants/colors';

export interface BirthInfoFormData {
  name?: string;
  birthYear: string;
  birthMonth: string;
  birthDay: string;
  birthHour: string;
  birthMinute: string;
  gender: '남성' | '여성' | '';
  calendarType: '양력' | '음력' | '';
  isLeapMonth: boolean;
  isTimeUnknown: boolean;
}

interface BirthInfoFormProps {
  data: BirthInfoFormData;
  onChange: (field: keyof BirthInfoFormData, value: any) => void;
  showName?: boolean;
  showTitle?: boolean;
  title?: string;
  subtitle?: string;
  isNameEditable?: boolean;
}

const BirthInfoForm: React.FC<BirthInfoFormProps> = ({
  data,
  onChange,
  showName = false,
  showTitle = false,
  title,
  subtitle,
  isNameEditable = true,
}) => {
  const handleDateChange = (text: string) => {
    // 숫자만 허용
    const cleaned = text.replace(/[^0-9]/g, '');
    
    // 자동으로 점 추가
    let formatted = '';
    if (cleaned.length > 0) formatted += cleaned.slice(0, 4);
    if (cleaned.length > 4) formatted += '.' + cleaned.slice(4, 6);
    if (cleaned.length > 6) formatted += '.' + cleaned.slice(6, 8);
    
    // 각 부분 업데이트
    const parts = formatted.split('.');
    let year = parts[0] || '';
    let month = parts[1] || '';
    let day = parts[2] || '';
    
    // 유효성 검사
    if (month && parseInt(month) > 12) {
      month = '12';
    }
    if (day && parseInt(day) > 31) {
      day = '31';
    }
    
    onChange('birthYear', year);
    onChange('birthMonth', month);
    onChange('birthDay', day);
  };

  const handleTimeChange = (text: string) => {
    if (!data.isTimeUnknown) {
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

      // 각 부분 업데이트
      onChange('birthHour', hour || '');
      onChange('birthMinute', minute || '');
    }
  };

  const dateValue = data.birthYear || data.birthMonth || data.birthDay
    ? `${data.birthYear || ''}${data.birthMonth ? `.${data.birthMonth}` : ''}${data.birthDay ? `.${data.birthDay}` : ''}`
    : '';

  const timeValue = data.birthHour || data.birthMinute
    ? `${data.birthHour || ''}${data.birthMinute ? `:${data.birthMinute}` : ''}`
    : '';

  const isLunar = data.calendarType === '음력';

  return (
    <View style={styles.container}>
      {showTitle && (
        <>
          {title && <Text style={styles.title}>{title}</Text>}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </>
      )}

      {showName && (
        <View style={styles.inputContainer}>
          <Text style={styles.label}>이름</Text>
          <TextInput
            style={[
              styles.nameInput,
              !isNameEditable && styles.nameInputDisabled,
            ]}
            value={data.name || ''}
            onChangeText={(text) => {
              // 한글, 영문만 허용 (숫자, 특수문자 제거)
              const filteredText = text.replace(/[^ㄱ-ㅎㅏ-ㅣ가-힣a-zA-Z\s]/g, '');
              onChange('name', filteredText);
            }}
            placeholder="이름을 입력하세요"
            maxLength={10}
            editable={isNameEditable}
          />
        </View>
      )}

      <View style={styles.inputContainer}>
        <Text style={styles.label}>생년월일</Text>
        <View style={styles.dateInputContainer}>
          <TextInput
            style={styles.dateInput}
            placeholder="1992.02.06"
            value={dateValue}
            onChangeText={handleDateChange}
            keyboardType="number-pad"
            maxLength={10}
          />
          {dateValue && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                onChange('birthYear', '');
                onChange('birthMonth', '');
                onChange('birthDay', '');
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
                data.calendarType === '양력' && styles.calendarTypeButtonSelected
              ]}
              onPress={() => onChange('calendarType', '양력')}
            >
              <Text style={[
                styles.calendarTypeText,
                data.calendarType === '양력' && styles.calendarTypeTextSelected
              ]}>양력</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.calendarTypeButton,
                data.calendarType === '음력' && styles.calendarTypeButtonSelected
              ]}
              onPress={() => onChange('calendarType', '음력')}
            >
              <Text style={[
                styles.calendarTypeText,
                data.calendarType === '음력' && styles.calendarTypeTextSelected
              ]}>음력</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.label, { marginTop: 22 }]}>윤달 여부(음력 시 선택)</Text>
          <View style={styles.calendarTypeContainer}>
            <TouchableOpacity
              style={[
                styles.calendarTypeButton,
                !data.isLeapMonth && styles.calendarTypeButtonSelected,
                !isLunar && styles.disabledButton
              ]}
              onPress={() => isLunar && onChange('isLeapMonth', false)}
              disabled={!isLunar}
            >
              <Text style={[
                styles.calendarTypeText,
                !data.isLeapMonth && styles.calendarTypeTextSelected,
                !isLunar && styles.disabledText
              ]}>평달</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.calendarTypeButton,
                data.isLeapMonth && styles.calendarTypeButtonSelected,
                !isLunar && styles.disabledButton
              ]}
              onPress={() => isLunar && onChange('isLeapMonth', true)}
              disabled={!isLunar}
            >
              <Text style={[
                styles.calendarTypeText,
                data.isLeapMonth && styles.calendarTypeTextSelected,
                !isLunar && styles.disabledText
              ]}>윤달</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>성별</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, data.gender === '남성' && styles.radioButtonSelected]}
            onPress={() => onChange('gender', '남성')}
          >
            <Text style={[styles.radioText, data.gender === '남성' && styles.radioTextSelected]}>
              남성
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.radioButton, data.gender === '여성' && styles.radioButtonSelected]}
            onPress={() => onChange('gender', '여성')}
          >
            <Text style={[styles.radioText, data.gender === '여성' && styles.radioTextSelected]}>
              여성
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>태어난 시간</Text>
        <View style={styles.timeInputContainer}>
          <TextInput
            style={[styles.timeInput, data.isTimeUnknown && styles.disabledInput]}
            placeholder="07:40"
            value={timeValue}
            onChangeText={handleTimeChange}
            keyboardType="number-pad"
            maxLength={5}
            editable={!data.isTimeUnknown}
          />
          {!data.isTimeUnknown && timeValue && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                onChange('birthHour', '');
                onChange('birthMinute', '');
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
          onPress={() => onChange('isTimeUnknown', !data.isTimeUnknown)}
        >
          <View style={[styles.checkbox, data.isTimeUnknown && styles.checkboxSelected]}>
            {data.isTimeUnknown && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>시간 몰라요</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
    flexShrink: 1,
    paddingHorizontal: 16,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
    flexShrink: 1,
    paddingHorizontal: 16,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
  },
  nameInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 6,
    fontSize: 18,
    color: '#333',
  },
  nameInputDisabled: {
    color: '#999',
    borderBottomColor: '#eee',
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    fontSize: 18,
    color: '#333',
  },
  timeInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 5,
    paddingRight: 30,
    fontSize: 18,
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
    marginTop: 10,
  },
  calendarTypeButton: {
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
    minWidth: 140,
    minHeight: 40,
    alignItems: 'center',
  },
  calendarTypeButtonSelected: {
    backgroundColor: Colors.primaryColor,
    borderColor: Colors.primaryColor,
  },
  calendarTypeText: {
    fontSize: 15,
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
  disabledButton: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  radioContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  radioButton: {
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
    minWidth: 140,
    minHeight: 40,
    alignItems: 'center',
  },
  radioButtonSelected: {
    backgroundColor: Colors.primaryColor,
    borderColor: Colors.primaryColor,
  },
  radioText: {
    fontSize: 15,
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
    fontSize: 13,
    color: '#333',
  },
});

export default BirthInfoForm;

