import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { PartnerBirthInfo, RelationshipStatus, RELATIONSHIP_STATUS_LABELS } from '../../types/partner';
import { isIPad } from '../../utils/platform';

const IS_IPAD = isIPad();

interface PartnerInputFormProps {
  birthInfo: PartnerBirthInfo;
  setBirthInfo: (info: PartnerBirthInfo) => void;
  title: string;
  showName?: boolean;
  showRelationship?: boolean; // 상대방 정보 입력 시 관계 상태 표시
  isModal?: boolean; // 모달에서 사용할 때 카드 스타일 제거
}

const PartnerInputForm: React.FC<PartnerInputFormProps> = ({
  birthInfo,
  setBirthInfo,
  title,
  showName = true,
  showRelationship = false,
  isModal = false,
}) => {
  const relationshipOptions: RelationshipStatus[] = ['dating', 'married', 'interested', 'breakup', 'other'];

  return (
    <View style={[styles.container, isModal && styles.modalContainer]}>
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

      {/* 관계 상태 선택 (상대방 정보 입력 시만) */}
      {showRelationship && (
        <View style={styles.inputContainer}>
          <Text style={styles.label}>관계 상태 *</Text>
          <View style={styles.relationshipContainer}>
            {relationshipOptions.map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.relationshipButton,
                  (birthInfo as PartnerBirthInfo).relationshipStatus === status && styles.relationshipButtonSelected,
                ]}
                onPress={() => {
                  setBirthInfo({
                    ...birthInfo,
                    relationshipStatus: status,
                  } as PartnerBirthInfo);
                }}
              >
                <Text
                  style={[
                    styles.relationshipButtonText,
                    (birthInfo as PartnerBirthInfo).relationshipStatus === status && styles.relationshipButtonTextSelected,
                  ]}
                >
                  {RELATIONSHIP_STATUS_LABELS[status]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
              
              setBirthInfo({
                ...birthInfo,
                birthYear: year,
                birthMonth: month,
                birthDay: day,
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
    elevation: 0.3,
  },
  title: {
    fontSize: IS_IPAD ? 24 : 17,
    fontWeight: 'bold',
    color: Colors.primaryColor,
    marginBottom: 0,
  },
  inputContainer: {
    marginBottom: IS_IPAD ? 24 : 16,
  },
  label: {
    fontSize: IS_IPAD ? 20 : 15,
    fontWeight: '600',
    marginBottom: IS_IPAD ? 12 : 8,
    color: '#333',
  },
  nameInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: IS_IPAD ? 12 : 8,
    fontSize: IS_IPAD ? 20 : 16,
    color: '#333',
  },
  dateInputContainer: {
    position: 'relative',
    marginBottom: IS_IPAD ? 28 : 18,
  },
  timeInputContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  dateInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: IS_IPAD ? 12 : 8,
    paddingRight: IS_IPAD ? 40 : 30,
    fontSize: IS_IPAD ? 22 : 17,
    color: '#333',
  },
  timeInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: IS_IPAD ? 12 : 8,
    paddingRight: IS_IPAD ? 40 : 30,
    fontSize: IS_IPAD ? 22 : 17,
    color: '#333',
  },
  clearButton: {
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: [{ translateY: IS_IPAD ? -16 : -11 }],
    width: IS_IPAD ? 32 : 24,
    height: IS_IPAD ? 32 : 24,
    borderRadius: IS_IPAD ? 16 : 12,
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: IS_IPAD ? 18 : 13,
    color: '#666',
  },
  calendarTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: IS_IPAD ? 16 : 10,
    gap: IS_IPAD ? 16 : 10,
  },
  calendarTypeButton: {
    flex: 1,
    padding: IS_IPAD ? 18 : 12,
    borderRadius: IS_IPAD ? 24 : 18,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
    minHeight: IS_IPAD ? 58 : 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarTypeButtonSelected: {
    backgroundColor: Colors.primaryColor,
    borderColor: Colors.primaryColor,
  },
  calendarTypeText: {
    fontSize: IS_IPAD ? 20 : 15,
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
    marginTop: IS_IPAD ? 16 : 10,
    gap: IS_IPAD ? 16 : 10,
  },
  radioButton: {
    flex: 1,
    padding: IS_IPAD ? 18 : 12,
    borderRadius: IS_IPAD ? 24 : 18,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
    minHeight: IS_IPAD ? 58 : 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    backgroundColor: Colors.primaryColor,
    borderColor: Colors.primaryColor,
  },
  radioText: {
    fontSize: IS_IPAD ? 20 : 15,
    color: '#333',
  },
  radioTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: IS_IPAD ? 6 : 0,
  },
  checkbox: {
    width: IS_IPAD ? 24 : 18,
    height: IS_IPAD ? 24 : 18,
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: IS_IPAD ? 5 : 4,
    marginRight: IS_IPAD ? 12 : 8,
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
    fontSize: IS_IPAD ? 16 : 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: IS_IPAD ? 18 : 14,
    color: '#333',
  },
  relationshipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: IS_IPAD ? 12 : 8,
  },
  relationshipButton: {
    paddingHorizontal: IS_IPAD ? 24 : 16,
    paddingVertical: IS_IPAD ? 12 : 8,
    borderRadius: IS_IPAD ? 24 : 18,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
  },
  relationshipButtonSelected: {
    backgroundColor: Colors.primaryColor,
    borderColor: Colors.primaryColor,
  },
  relationshipButtonText: {
    fontSize: IS_IPAD ? 18 : 14,
    color: '#666',
  },
  relationshipButtonTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  modalContainer: {
    backgroundColor: 'transparent',
    padding: 0,
    marginBottom: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
});

export default PartnerInputForm;

