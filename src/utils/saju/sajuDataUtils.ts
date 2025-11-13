import { SajuData } from '../../types/streaming';

/**
 * DB에서 가져온 birth_infos 데이터를 SajuData 형태로 변환
 */
export const formatSajuData = (birthData: any): SajuData => {
  // saju_data가 JSON 문자열이면 파싱
  let parsedSajuData: any = {};
  if (birthData.saju_data) {
    if (typeof birthData.saju_data === 'string') {
      try {
        parsedSajuData = JSON.parse(birthData.saju_data);
      } catch (e) {
        console.error('saju_data 파싱 실패:', e);
        parsedSajuData = {};
      }
    } else {
      parsedSajuData = birthData.saju_data;
    }
  }

  return {
    name: birthData.name || '사용자',
    birthYear: birthData.year ?? null,
    birthMonth: birthData.month ?? null,
    birthDay: birthData.day ?? null,
    birthHour: birthData.hour ?? null,
    birthMinute: birthData.minute ?? null,
    gender: birthData.gender ?? null,
    calendarType: birthData.calendar_type ?? null,
    leapMonth: birthData.is_leap_month ?? false,
    timeUnknown: birthData.is_time_unknown ?? false,
    calculatedSaju: parsedSajuData,
    pillars: parsedSajuData?.pillars || {},
    tenGods: parsedSajuData?.ten_gods || {},
    lifeStages: parsedSajuData?.life_stages || {},
  };
};

/**
 * 사주 데이터 유효성 검사
 */
export const validateSajuData = (data: SajuData | null): boolean => {
  if (!data) return false;
  if (!data.calculatedSaju) return false;
  
  const { calculatedSaju } = data;
  
  // 필수 간지 데이터 확인
  if (!calculatedSaju.yearHangulGanji || 
      !calculatedSaju.monthHangulGanji || 
      !calculatedSaju.dayHangulGanji || 
      !calculatedSaju.timeHangulGanji) {
    return false;
  }
  
  return true;
};
