import { SajuData } from '../types/streaming';

/**
 * DB에서 가져온 birth_infos 데이터를 SajuData 형태로 변환
 */
export const formatSajuData = (birthData: any): SajuData => {
  return {
    name: birthData.name || '사용자',
    birthYear: birthData.year,
    birthMonth: birthData.month,
    birthDay: birthData.day,
    birthHour: birthData.hour || 0,
    birthMinute: birthData.minute || 0,
    gender: birthData.gender,
    calendarType: birthData.calendar_type,
    leapMonth: birthData.is_leap_month,
    timeUnknown: birthData.is_time_unknown,
    calculatedSaju: birthData.saju_data || {},
    pillars: birthData.saju_data?.pillars || {},
    tenGods: birthData.saju_data?.ten_gods || {},
    lifeStages: birthData.saju_data?.life_stages || {},
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
