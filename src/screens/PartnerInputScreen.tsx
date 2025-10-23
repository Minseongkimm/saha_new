import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import CustomHeader from '../components/CustomHeader';
import BirthInputForm from '../components/BirthInputForm';
import { PartnerBirthInfo } from '../types/partner';
import { startChatWithExpert } from '../utils/chatUtils';
import { RootStackParamList } from '../types/navigation';
import { calculatePartnerSaju } from '../utils/partnerSajuCalculator';
import { savePartnerToDatabase } from '../utils/partnerDatabase';

interface PartnerInputScreenProps {
  navigation: any;
  route: RouteProp<RootStackParamList, 'PartnerInput'>;
}

const PartnerInputScreen: React.FC<PartnerInputScreenProps> = ({ navigation, route }) => {
  const { expertId } = route.params;
  const [partnerInfo, setPartnerInfo] = useState<PartnerBirthInfo>({
    name: '',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    birthHour: '',
    birthMinute: '',
    gender: '',
    calendarType: 'solar',
    isLeapMonth: false,
    isTimeUnknown: false,
    relationshipStatus: 'interested',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    // 입력값 검증
    if (!partnerInfo.name.trim()) {
      Alert.alert('오류', '상대방 이름을 입력해주세요.');
      return;
    }
    if (!partnerInfo.birthYear || !partnerInfo.birthMonth || !partnerInfo.birthDay) {
      Alert.alert('오류', '생년월일을 입력해주세요.');
      return;
    }
    if (!partnerInfo.gender) {
      Alert.alert('오류', '성별을 선택해주세요.');
      return;
    }

    try {
      setIsLoading(true);
      
      // 1. 상대방 사주 계산
      console.log('상대방 사주 계산 중...');
      const partnerSajuData = await calculatePartnerSaju(partnerInfo);
      
      // 2. DB에 상대방 정보 저장
      console.log('상대방 정보 저장 중...');
      const partnerId: string = await savePartnerToDatabase(partnerInfo, partnerSajuData);
      
      console.log('상대방 정보 저장 완료:', partnerId);
      
      // 3. 채팅 시작 (상대방 정보 포함)
      const partnerData = {
        partnerInfo,
        partnerSajuData,
        partnerId
      };
      await startChatWithExpert(navigation, expertId, partnerData);
    } catch (error) {
      console.error('상대방 정보 저장 오류:', error);
      Alert.alert('오류', '상대방 정보 저장에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader
        title="상대방 정보 입력"
        onBackPress={() => navigation.goBack()}
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <BirthInputForm
          birthInfo={partnerInfo as any}
          setBirthInfo={setPartnerInfo as any}
          title=""
          showName={true}
          showRelationship={true}
          isModal={true}
        />
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.saveButtonText}>저장하고 채팅 시작</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    padding: 18,
    paddingBottom: 0, // Safe area
  },
  saveButton: {
    backgroundColor: Colors.primaryColor,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PartnerInputScreen;
