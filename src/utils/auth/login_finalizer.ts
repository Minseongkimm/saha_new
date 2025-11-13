import { User } from '@supabase/supabase-js';
import { supabase } from '../database/supabaseClient';

export type LoginMetadata = Record<string, unknown>;

// 지정된 시간만큼 지연
const delay = (duration: number): Promise<void> =>
  new Promise(resolve => {
    setTimeout(resolve, duration);
  });

// 사용자의 생년월일 정보 존재 여부 확인
const ensureBirthInfoExists = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from('birth_infos')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }
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

  await ensureBirthInfoExists(user.id);
  await waitForSession();
};

