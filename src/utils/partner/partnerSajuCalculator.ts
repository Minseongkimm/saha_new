import { calculateSaju } from '../saju/ganji_local';
import { SajuInput, SajuResult } from '../saju/ganji_local';
import { SajuInfo } from '../saju-calculator/types';
import { SajuUtils } from '../saju-calculator/utils/SajuUtils';
import { PartnerBirthInfo } from '../../types/partner';

/**
 * 상대방 사주 계산 함수
 * 기존 calculateSaju 로직을 재사용하여 상대방 정보로 사주를 계산합니다.
 */
export const calculatePartnerSaju = async (partnerInfo: PartnerBirthInfo): Promise<SajuResult> => {
  try {
    const shouldUseUnknownTime = partnerInfo.isTimeUnknown ||
      !partnerInfo.birthHour ||
      !partnerInfo.birthMinute;
    // PartnerBirthInfo를 SajuInput 형태로 변환
    const sajuInput: SajuInput = {
      year: parseInt(partnerInfo.birthYear),
      month: parseInt(partnerInfo.birthMonth),
      day: parseInt(partnerInfo.birthDay),
      hour: shouldUseUnknownTime ? null : parseInt(partnerInfo.birthHour),
      minute: shouldUseUnknownTime ? null : parseInt(partnerInfo.birthMinute),
      isLunar: partnerInfo.calendarType === 'lunar',
      isLeapMonth: partnerInfo.isLeapMonth,
    };

    // 기존 사주 계산 로직 사용
    const sajuResult = calculateSaju(sajuInput);
    
    return sajuResult;
  } catch (error) {
    console.error('상대방 사주 계산 오류:', error);
    throw new Error('상대방 사주 계산에 실패했습니다.');
  }
};

/**
 * 상대방 사주 데이터를 DB 저장용 형태로 변환
 */
export const formatPartnerSajuForDB = (partnerInfo: PartnerBirthInfo, sajuData: SajuResult) => {
  const isTimeUnknown = partnerInfo.isTimeUnknown ||
    !partnerInfo.birthHour ||
    !partnerInfo.birthMinute;
  return {
    partner_name: partnerInfo.name,
    relationship_status: partnerInfo.relationshipStatus,
    birth_info: {
      name: partnerInfo.name,
      birthYear: partnerInfo.birthYear,
      birthMonth: partnerInfo.birthMonth,
      birthDay: partnerInfo.birthDay,
      birthHour: isTimeUnknown ? '' : partnerInfo.birthHour,
      birthMinute: isTimeUnknown ? '' : partnerInfo.birthMinute,
      gender: partnerInfo.gender,
      calendarType: partnerInfo.calendarType,
      isLeapMonth: partnerInfo.isLeapMonth,
      isTimeUnknown,
    },
    saju_data: sajuData,
  };
};

/**
 * SajuResult(한글 간지)를 SajuInfo(한자 간지)로 변환
 */
export const convertSajuResultToSajuInfo = (
  sajuResult: SajuResult,
  birthYear: number,
  gender: 'male' | 'female' | number
): SajuInfo => {
  const genderNum = typeof gender === 'number' ? gender : gender === 'male' ? 0 : 1;
  return {
    yearGanji: SajuUtils.getHangulToHanjaString(sajuResult.yearHangulGanji),
    monthGanji: SajuUtils.getHangulToHanjaString(sajuResult.monthHangulGanji),
    dayGanji: SajuUtils.getHangulToHanjaString(sajuResult.dayHangulGanji),
    timeGanji: SajuUtils.getHangulToHanjaString(sajuResult.timeHangulGanji),
    birthYear,
    gender: genderNum
  };
};
