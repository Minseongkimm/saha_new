import { User } from '@supabase/supabase-js';
import { supabase } from '../database/supabaseClient';

export type LoginMetadata = Record<string, unknown>;

// 지정된 시간만큼 지연
const delay = (duration: number): Promise<void> =>
  new Promise(resolve => {
    setTimeout(resolve, duration);
  });

// 사용자의 생년월일 정보 존재 여부 확인 및 초기 레코드 생성
const ensureBirthInfoExists = async (userId: string, userName: string): Promise<void> => {
  const { data: existingData, error: selectError } = await supabase
    .from('birth_info')
    .select('id')
    .eq('user_id', userId)
    .single();

  // 레코드가 없으면 생성 (user_id, name만 저장, 나머지는 null)
  if (selectError && selectError.code === 'PGRST116') {
    const { error: insertError } = await supabase
      .from('birth_info')
      .insert({
        user_id: userId,
        name: userName,
        // 나머지 필드는 null로 저장 (사주 입력 시 업데이트됨)
      });

    if (insertError) {
      console.error('birth_info 초기 레코드 생성 오류:', insertError);
      // 에러를 throw하지 않고 로그만 남김 (사주 입력 화면에서 처리 가능)
    }
  } else if (selectError) {
    // 다른 종류의 에러는 throw
    throw selectError;
  }
  // 레코드가 이미 있으면 아무것도 하지 않음
};

// 세션이 활성화될 때까지 대기
const waitForSession = async (): Promise<void> => {
  let retries = 0;
  const maxRetries = 20;

  while (retries < maxRetries) {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      return;
    }
    await delay(100);
    retries += 1;
  }
};

// 약관 동의 기록 저장 (기존 동의 기록이 없는 경우에만)
const saveTermsAgreement = async (userId: string): Promise<void> => {
  try {
    // 약관 버전은 하드코딩 (약관 내용도 하드코딩되어 있으므로)
    const termsVersion = 'v1';
    const privacyVersion = 'v1';

    // 기존 동의 기록 확인
    const { data: existingAgreements } = await supabase
      .from('terms_agreements')
      .select('terms_type')
      .eq('user_id', userId);

    const existingTypes = new Set(existingAgreements?.map(a => a.terms_type) || []);

    // 기존에 동의 기록이 없는 약관만 저장
    if (!existingTypes.has('terms_of_service')) {
      await supabase.from('terms_agreements').insert({
        user_id: userId,
        terms_type: 'terms_of_service',
        terms_version: termsVersion,
      });
    }

    if (!existingTypes.has('privacy_policy')) {
      await supabase.from('terms_agreements').insert({
        user_id: userId,
        terms_type: 'privacy_policy',
        terms_version: privacyVersion,
      });
    }
  } catch (error) {
    console.error('약관 동의 기록 저장 오류:', error);
    // 에러를 throw하지 않고 로그만 남김 (약관 동의는 user_metadata에도 저장되므로)
  }
};

// 로그인 이후 사용자 정보 갱신 및 세션 활성화
export const executePostLogin = async (user: User, extras: LoginMetadata): Promise<void> => {
  const metadata = {
    ...user.user_metadata,
    ...extras,
    agreed_to_terms: true,
    terms_agreed_at: new Date().toISOString(),
  };

  const { error } = await supabase.auth.updateUser({ data: metadata });

  if (error) {
    console.error('약관 동의 정보 저장 오류:', error);
  }

  // 사용자 이름 가져오기 (user_metadata와 extras에서 확인)
  const userMetadata = user.user_metadata || {};
  const userName = (extras.name as string | undefined) ||
                   (userMetadata.name as string | undefined) ||
                   (userMetadata.full_name as string | undefined) ||
                   (userMetadata.preferred_username as string | undefined) ||
                   (userMetadata.user_name as string | undefined) ||
                   user.email?.split('@')[0] ||
                   '사용자';

  // 약관 동의 기록을 terms_agreements 테이블에 저장
  await saveTermsAgreement(user.id);
  
  await ensureBirthInfoExists(user.id, userName);
  await waitForSession();
};

