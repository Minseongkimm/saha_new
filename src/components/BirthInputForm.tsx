import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Colors } from '../constants/colors';

export interface BirthInfo {
  name: string;
  birthYear: string;
  birthMonth: string;
  birthDay: string;
  birthHour: string;
  birthMinute: string;
  gender: string; // 'male' 또는 'female'
  calendarType: string; // 'solar' 또는 'lunar'
  isLeapMonth: boolean;
  isTimeUnknown: boolean;
}

interface BirthInputFormProps {
  birthInfo: BirthInfo;
  setBirthInfo: (info: BirthInfo) => void;
  title: string;
  showName?: boolean;
}

const BirthInputForm: React.FC<BirthInputFormProps> = ({
  birthInfo,
  setBirthInfo,
  title,
  showName = true,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      
      {showName && (
        <View style={styles.inputContainer}>
          <Text style={styles.label}>이름 *</Text>
          <TextInput
            style={styles.nameInput}
            value={birthInfo.name}
            onChangeText={(text) => {
              // 한글, 영문만 허용 (숫자, 특수문자 제거) - 한글 조합 문자도 포함
              const filteredText = text.replace(/[^ㄱ-ㅎㅏ-ㅣ가-힣a-zA-Z\s]/g, '');
              setBirthInfo({ ...birthInfo, name: filteredText });
            }}
            placeholder="이름을 입력하세요"
            maxLength={10}
          />
        </View>
      )}

      <View style={styles.inputContainer}>
        <Text style={styles.label}>생년월일 *</Text>
        <View style={styles.dateInputContainer}>
          <TextInput
            style={styles.dateInput}
            placeholder="1992.02.06"
            value={birthInfo.birthYear || birthInfo.birthMonth || birthInfo.birthDay ? 
              `${birthInfo.birthYear || ''}${birthInfo.birthMonth ? `.${birthInfo.birthMonth}` : ''}${birthInfo.birthDay ? `.${birthInfo.birthDay}` : ''}` 
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
              setBirthInfo({
                ...birthInfo,
                birthYear: parts[0] || '',
                birthMonth: parts[1] || '',
                birthDay: parts[2] || '',
              });
            }}
            keyboardType="number-pad"
            maxLength={10} // YYYY.MM.DD
          />
          {(birthInfo.birthYear || birthInfo.birthMonth || birthInfo.birthDay) && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setBirthInfo({
                  ...birthInfo,
                  birthYear: '',
                  birthMonth: '',
                  birthDay: '',
                });
              }}
            >
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.label}>달력</Text>
        <View style={styles.calendarTypeContainer}>
          <TouchableOpacity
            style={[
              styles.calendarTypeButton,
              birthInfo.calendarType === 'solar' && styles.calendarTypeButtonSelected
            ]}
            onPress={() => setBirthInfo({ ...birthInfo, calendarType: 'solar' })}
          >
            <Text style={[
              styles.calendarTypeText,
              birthInfo.calendarType === 'solar' && styles.calendarTypeTextSelected
            ]}>양력</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.calendarTypeButton,
              birthInfo.calendarType === 'lunar' && styles.calendarTypeButtonSelected
            ]}
            onPress={() => setBirthInfo({ ...birthInfo, calendarType: 'lunar' })}
          >
            <Text style={[
              styles.calendarTypeText,
              birthInfo.calendarType === 'lunar' && styles.calendarTypeTextSelected
            ]}>음력</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { marginTop: 22 }]}>윤달 여부(음력 시 선택)</Text>
        <View style={styles.calendarTypeContainer}>
          <TouchableOpacity
            style={[
              styles.calendarTypeButton,
              !birthInfo.isLeapMonth && styles.calendarTypeButtonSelected,
              birthInfo.calendarType === 'solar' && styles.disabledButton
            ]}
            onPress={() => birthInfo.calendarType === 'lunar' && setBirthInfo({ ...birthInfo, isLeapMonth: false })}
            disabled={birthInfo.calendarType === 'solar'}
          >
            <Text style={[
              styles.calendarTypeText,
              !birthInfo.isLeapMonth && styles.calendarTypeTextSelected,
              birthInfo.calendarType === 'solar' && styles.disabledText
            ]}>평달</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.calendarTypeButton,
              birthInfo.isLeapMonth && styles.calendarTypeButtonSelected,
              birthInfo.calendarType === 'solar' && styles.disabledButton
            ]}
            onPress={() => birthInfo.calendarType === 'lunar' && setBirthInfo({ ...birthInfo, isLeapMonth: true })}
            disabled={birthInfo.calendarType === 'solar'}
          >
            <Text style={[
              styles.calendarTypeText,
              birthInfo.isLeapMonth && styles.calendarTypeTextSelected,
              birthInfo.calendarType === 'solar' && styles.disabledText
            ]}>윤달</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>성별 *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity 
            style={[styles.radioButton, birthInfo.gender === 'male' && styles.radioButtonSelected]}
            onPress={() => setBirthInfo({ ...birthInfo, gender: 'male' })}
          >
            <Text style={[styles.radioText, birthInfo.gender === 'male' && styles.radioTextSelected]}>
              남성
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.radioButton, birthInfo.gender === 'female' && styles.radioButtonSelected]}
            onPress={() => setBirthInfo({ ...birthInfo, gender: 'female' })}
          >
            <Text style={[styles.radioText, birthInfo.gender === 'female' && styles.radioTextSelected]}>
              여성
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>태어난 시간</Text>
        <View style={styles.timeInputContainer}>
          <TextInput
            style={[styles.timeInput, birthInfo.isTimeUnknown && styles.disabledInput]}
            placeholder="07:40"
            value={birthInfo.birthHour || birthInfo.birthMinute ? 
              `${birthInfo.birthHour || ''}${birthInfo.birthMinute ? `:${birthInfo.birthMinute}` : ''}` 
              : ''
            }
            onChangeText={(text) => {
              if (!birthInfo.isTimeUnknown) {
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

                setBirthInfo({
                  ...birthInfo,
                  birthHour: hour || '',
                  birthMinute: minute || '',
                });
              }
            }}
            keyboardType="number-pad"
            maxLength={5} // HH:mm
            editable={!birthInfo.isTimeUnknown}
          />
          {!birthInfo.isTimeUnknown && (birthInfo.birthHour || birthInfo.birthMinute) && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setBirthInfo({
                  ...birthInfo,
                  birthHour: '',
                  birthMinute: '',
                });
              }}
            >
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          style={styles.checkboxContainer}
          onPress={() => setBirthInfo({ ...birthInfo, isTimeUnknown: !birthInfo.isTimeUnknown })}
        >
          <View style={[styles.checkbox, birthInfo.isTimeUnknown && styles.checkboxSelected]}>
            {birthInfo.isTimeUnknown && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>시간 몰라요</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primaryColor,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  nameInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 8,
    fontSize: 16,
    color: '#333',
  },
  dateInputContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  timeInputContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  dateInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 8,
    paddingRight: 30,
    fontSize: 18,
    color: '#333',
  },
  timeInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 8,
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
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
    minWidth: 140,
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
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
    minWidth: 140,
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
    marginTop: 8,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 3,
    marginRight: 8,
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
});

export default BirthInputForm;
