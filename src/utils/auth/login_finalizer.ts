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
    .from('birth_infos')
    .select('id')
    .eq('user_id', userId)
    .single();

  // 레코드가 없으면 생성 (user_id, name만 저장, 나머지는 null)
  if (selectError && selectError.code === 'PGRST116') {
    const { error: insertError } = await supabase
      .from('birth_infos')
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

  await ensureBirthInfoExists(user.id, userName);
  await waitForSession();
};

