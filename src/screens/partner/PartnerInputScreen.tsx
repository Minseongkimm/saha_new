import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Colors } from '../../constants/colors';
import SabaLoader from '../../components/common/SabaLoader';
import CustomHeader from '../../components/common/CustomHeader';
import PartnerInputForm from '../../components/forms/PartnerInputForm';
import { safeGoBack } from '../../utils/navigation/safeGoBack';
import { PartnerBirthInfo } from '../../types/partner';
import { startChatWithExpert } from '../../utils/chat/chatUtils';
import { RootStackParamList } from '../../types/navigation';
import { calculatePartnerSaju, convertSajuResultToSajuInfo } from '../../utils/partner/partnerSajuCalculator';
import { savePartnerToDatabase } from '../../utils/partner/partnerDatabase';
import { SajuCalculator } from '../../utils/saju-calculator/core/SajuCalculator';
import { SajuInfo } from '../../utils/saju-calculator/types';
import { supabase } from '../../utils/database/supabaseClient';
import { calculateSaju, SajuResult } from '../../utils/saju/ganji_local';

type PartnerInputScreenProps = StackScreenProps<RootStackParamList, 'PartnerInput'>;

const PartnerInputScreen = ({ navigation, route }: PartnerInputScreenProps) => {
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
      const partnerSajuData = await calculatePartnerSaju(partnerInfo);

      // 2. 로컬 궁합 계산 (사용자 사주 + 상대 사주)
      const sajuCalculator = new SajuCalculator();

      // 사용자 사주 정보 불러오기 → SajuInfo 변환
      let userSajuInfo: SajuInfo | null = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('birth_info')
            .select('*')
            .eq('user_id', user.id)
            .single();
          if (data) {
            const userSajuInput = {
              year: Number(data.year),
              month: Number(data.month),
              day: Number(data.day),
              hour: data.isTimeUnknown ? null : Number(data.hour ?? 0),
              minute: data.isTimeUnknown ? null : Number(data.minute ?? 0),
              isLunar: Boolean(data.isLunar),
              isLeapMonth: Boolean(data.isLeapMonth),
            };
            const userSajuResult: SajuResult = calculateSaju(userSajuInput);
            userSajuInfo = convertSajuResultToSajuInfo(
              userSajuResult,
              Number(data.year),
              data.gender === 'male' ? 'male' : 'female'
            );
          }
        }
      } catch {}

      const partnerSajuInfo: SajuInfo = convertSajuResultToSajuInfo(
        partnerSajuData,
        parseInt(partnerInfo.birthYear),
        partnerInfo.gender || 'male'
      );

      const compatibilityResult = userSajuInfo
        ? sajuCalculator.analyzeCompatibility(userSajuInfo, partnerSajuInfo)
        : null;

      // 3. DB에 상대방 정보 저장 (궁합 결과 포함)
      const partnerId: string = await savePartnerToDatabase(partnerInfo, partnerSajuData, compatibilityResult);
      
      // 4. 채팅 시작 (상대방 정보 + 로컬 궁합 포함)
      const partnerData = {
        partnerInfo,
        partnerSajuData,
        partnerId,
        compatibilityResult
      };
      
      // 채팅 시작 후 스택을 리셋하여 뒤로가기 시 상대방 입력 화면으로 돌아가지 않도록 함
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
        onBackPress={() => safeGoBack(navigation)}
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <PartnerInputForm
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
            <SabaLoader
              size={28}
              message=""
              containerStyle={{ justifyContent: 'center', alignItems: 'center' }}
            />
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
