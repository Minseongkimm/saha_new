import { supabase } from '../database/supabaseClient';
import { PartnerBirthInfo } from '../../types/partner';
import { SajuResult } from '../saju/ganji_local';
import { 
  setPartnerListCache, 
  addPartnerToCache,
  updatePartnerInCache,
  removePartnerFromCache
} from './partnerListCache';

type DerivedCompatColumns = {
  compat_score: number | null;
  compat_overall: string | null;
  compat_has_heavenly_stem_combo: boolean;
  compat_has_day_branch_yukhap: boolean;
  compat_has_day_branch_chung: boolean;
  compat_five_elements_complete: boolean;
  compat_counts: any;
};

const deriveCompatColumns = (compatibilityResult?: any): DerivedCompatColumns => {
  const compatScore: number | null = compatibilityResult?.score ?? null;
  const compatOverall: string | null = compatibilityResult?.overall ?? null;
  const dayPillarDesc: string = compatibilityResult?.categories?.dayPillar?.description ?? '';
  const jijiDesc: string = compatibilityResult?.categories?.jijiRelation?.description ?? '';
  const fiveDesc: string = compatibilityResult?.categories?.fiveElements?.description ?? '';
  const crossSummary: string = compatibilityResult?.extras?.cross?.summary ?? '';
  const compatHasHeavenlyStemCombo: boolean = dayPillarDesc.includes('천간합');
  const compatHasDayBranchYukhap: boolean = crossSummary.includes('일지 육합') || jijiDesc.includes('육합');
  const compatHasDayBranchChung: boolean = crossSummary.includes('일지 충') || jijiDesc.includes('충');
  const compatFiveElementsComplete: boolean = fiveDesc.includes('완비');
  const compatCounts: any = compatibilityResult?.extras?.cross?.counts ?? null;
  return {
    compat_score: compatScore,
    compat_overall: compatOverall,
    compat_has_heavenly_stem_combo: compatHasHeavenlyStemCombo,
    compat_has_day_branch_yukhap: compatHasDayBranchYukhap,
    compat_has_day_branch_chung: compatHasDayBranchChung,
    compat_five_elements_complete: compatFiveElementsComplete,
    compat_counts: compatCounts
  };
};

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

    // 호환 컬럼 파생 값 계산
    const derived = deriveCompatColumns(compatibilityResult);

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
        // 비정규화 컬럼 저장(정렬/필터 성능)
        ...derived
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
 * 저장된 상대방 사주 정보를 수정
 */
export const updatePartnerInDatabase = async (
  partnerId: string,
  partnerInfo: PartnerBirthInfo,
  sajuData: SajuResult,
  compatibilityResult?: any
): Promise<void> => {
  try {
    const derived = deriveCompatColumns(compatibilityResult);
    const { data, error } = await supabase
      .from('partner_saju')
      .update({
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
        compatibility_result: compatibilityResult,
        updated_at: new Date().toISOString(),
        ...derived
      })
      .eq('id', partnerId)
      .select('*')
      .single();

    if (error) {
      console.error('상대방 정보 수정 오류:', error);
      throw new Error('상대방 정보 수정에 실패했습니다.');
    }

    updatePartnerInCache(partnerId, data);
  } catch (error) {
    console.error('DB 수정 오류:', error);
    throw error;
  }
};

/**
 * 궁합 결과 업데이트(compatibility_result + 파생 컬럼 동시 갱신)
 */
export const updatePartnerCompatibility = async (
  partnerId: string,
  compatibilityResult: any
): Promise<void> => {
  try {
    const derived = deriveCompatColumns(compatibilityResult);
    const { data, error } = await supabase
      .from('partner_saju')
      .update({
        compatibility_result: compatibilityResult,
        ...derived,
        updated_at: new Date().toISOString()
      })
      .eq('id', partnerId)
      .select('*')
      .single();
    if (error) {
      console.error('궁합 업데이트 오류:', error);
      throw new Error('궁합 결과 업데이트에 실패했습니다.');
    }
    updatePartnerInCache(partnerId, data);
  } catch (error) {
    console.error('궁합 업데이트 오류:', error);
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
 * 점수 순 정렬된 상대방 목록 조회
 * @param ascending 오름차순 여부 (기본: 점수 높은 순)
 */
export const getPartnerListSortedByScore = async (ascending: boolean = false): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('partner_saju')
      .select('*')
      .order('compat_score', { ascending, nullsFirst: ascending });
    if (error) {
      console.error('❌ 점수 정렬 목록 조회 오류:', error);
      throw new Error('점수 정렬 목록을 불러오는데 실패했습니다.');
    }
    return data || [];
  } catch (error) {
    console.error('❌ 점수 정렬 목록 조회 오류:', error);
    throw error;
  }
};

/**
 * 일지 육합 커플만 조회
 */
export const getPartnersWithDayBranchYukhap = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('partner_saju')
      .select('*')
      .eq('compat_has_day_branch_yukhap', true)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('❌ 육합 필터 목록 조회 오류:', error);
      throw new Error('육합 필터 목록을 불러오는데 실패했습니다.');
    }
    return data || [];
  } catch (error) {
    console.error('❌ 육합 필터 목록 조회 오류:', error);
    throw error;
  }
};

/**
 * 일지 충 커플만 조회
 */
export const getPartnersWithDayBranchChung = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('partner_saju')
      .select('*')
      .eq('compat_has_day_branch_chung', true)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('❌ 충 필터 목록 조회 오류:', error);
      throw new Error('충 필터 목록을 불러오는데 실패했습니다.');
    }
    return data || [];
  } catch (error) {
    console.error('❌ 충 필터 목록 조회 오류:', error);
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
      .maybeSingle();

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
