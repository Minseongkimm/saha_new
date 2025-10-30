import { supabase } from '../database/supabaseClient';
import { PartnerBirthInfo } from '../../types/partner';
import { SajuResult } from '../saju/ganji_local';
import { 
  getPartnerListCache, 
  setPartnerListCache, 
  isPartnerListFresh,
  addPartnerToCache,
  updatePartnerInCache,
  removePartnerFromCache
} from './partnerListCache';

/**
 * 상대방 사주 정보를 DB에 저장
 */
export const savePartnerToDatabase = async (
  partnerInfo: PartnerBirthInfo,
  sajuData: SajuResult,
  compatibilityResult?: any
): Promise<string> => {
  try {
    // 현재 사용자 ID 가져오기
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('사용자 인증이 필요합니다.');
    }

    const { data, error } = await supabase
      .from('partner_saju')
      .insert({
        user_id: user.id, // 사용자 ID 명시적 설정
        partner_name: partnerInfo.name,
        relationship_status: partnerInfo.relationshipStatus,
        birth_info: {
          name: partnerInfo.name,
          birthYear: partnerInfo.birthYear,
          birthMonth: partnerInfo.birthMonth,
          birthDay: partnerInfo.birthDay,
          birthHour: partnerInfo.birthHour,
          birthMinute: partnerInfo.birthMinute,
          gender: partnerInfo.gender,
          calendarType: partnerInfo.calendarType,
          isLeapMonth: partnerInfo.isLeapMonth,
          isTimeUnknown: partnerInfo.isTimeUnknown,
        },
        saju_data: sajuData,
        compatibility_result: compatibilityResult, // 궁합 결과 저장
      })
      .select('id')
      .single();

    if (error) {
      console.error('상대방 정보 저장 오류:', error);
      throw new Error('상대방 정보 저장에 실패했습니다.');
    }

    // 캐시에 새 상대방 정보 추가
    const newPartner = {
      id: data.id,
      user_id: user.id,
      partner_name: partnerInfo.name,
      relationship_status: partnerInfo.relationshipStatus || 'interested',
      birth_info: {
        name: partnerInfo.name,
        birthYear: partnerInfo.birthYear,
        birthMonth: partnerInfo.birthMonth,
        birthDay: partnerInfo.birthDay,
        birthHour: partnerInfo.birthHour,
        birthMinute: partnerInfo.birthMinute,
        gender: partnerInfo.gender,
        calendarType: partnerInfo.calendarType,
        isLeapMonth: partnerInfo.isLeapMonth,
        isTimeUnknown: partnerInfo.isTimeUnknown,
      },
      saju_data: sajuData,
      compatibility_result: compatibilityResult,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    addPartnerToCache(newPartner);

    return data.id;
  } catch (error) {
    console.error('DB 저장 오류:', error);
    throw error;
  }
};

/**
 * 사용자의 모든 상대방 정보 조회 (캐시 활용)
 */
export const getPartnerList = async (): Promise<any[]> => {
  try {
    // DB에서 직접 조회 (캐시 확인은 호출하는 쪽에서 처리)
    const { data, error } = await supabase
      .from('partner_saju')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ 상대방 목록 조회 오류:', error);
      throw new Error('상대방 목록을 불러오는데 실패했습니다.');
    }

    const partners = data || [];
    
    // 캐시에 저장
    setPartnerListCache(partners);
    
    return partners;
  } catch (error) {
    console.error('❌ 상대방 목록 조회 오류:', error);
    throw error;
  }
};

/**
 * 특정 상대방 정보 조회
 */
export const getPartnerById = async (partnerId: string): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('partner_saju')
      .select('*')
      .eq('id', partnerId)
      .single();

    if (error) {
      console.error('상대방 정보 조회 오류:', error);
      throw new Error('상대방 정보를 불러오는데 실패했습니다.');
    }

    return data;
  } catch (error) {
    console.error('상대방 정보 조회 오류:', error);
    throw error;
  }
};

/**
 * 상대방 정보 삭제
 */
export const deletePartnerFromDatabase = async (partnerId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('partner_saju')
      .delete()
      .eq('id', partnerId);

    if (error) {
      console.error('상대방 정보 삭제 오류:', error);
      throw new Error('상대방 정보 삭제에 실패했습니다.');
    }

    // 캐시에서도 삭제
    removePartnerFromCache(partnerId);
  } catch (error) {
    console.error('상대방 정보 삭제 오류:', error);
    throw error;
  }
};
