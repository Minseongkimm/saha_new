import { login as kakaoLogin } from '@react-native-seoul/kakao-login';

import { supabase } from '../database/supabaseClient';
import { executePostLogin, LoginMetadata } from './login_finalizer';

export enum KakaoLoginErrorCode {
  IdTokenMissing = 'id_token_missing',
  SupabaseSignInFailed = 'supabase_sign_in_failed',
  SupabaseUserMissing = 'supabase_user_missing',
  Unknown = 'unknown',
}

export class KakaoLoginError extends Error {
  public readonly code: KakaoLoginErrorCode;

  constructor(code: KakaoLoginErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

// 카카오 로그인 결과에서 사용자 메타데이터 생성
const buildKakaoMetadata = (user: { user_metadata?: Record<string, unknown>; email?: string | null }): LoginMetadata => {
  const payload: LoginMetadata = {
    login_provider: 'kakao',
  };

  // Supabase가 카카오 ID 토큰에서 자동으로 파싱한 정보 확인
  const metadata = user.user_metadata || {};
  
  // 이름 정보 확인 및 저장
  const fullName = metadata.name || 
                   metadata.full_name || 
                   metadata.nickname || 
                   metadata.preferred_username ||
                   '';
  
  if (fullName && typeof fullName === 'string' && fullName.length > 0) {
    payload.name = fullName;
  }

  // 이메일 정보 확인 및 저장
  if (user.email) {
    payload.kakao_email = user.email;
  } else if (metadata.email && typeof metadata.email === 'string') {
    payload.kakao_email = metadata.email;
  }

  return payload;
};

// 카카오 로그인 요청을 수행하고 Supabase 인증까지 완료
export const performKakaoLogin = async (): Promise<void> => {
  try {
    const result = await kakaoLogin();

    if (!result.idToken) {
      throw new KakaoLoginError(
        KakaoLoginErrorCode.IdTokenMissing,
        'Unable to obtain Kakao ID token.',
      );
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'kakao',
      token: result.idToken,
    });

    if (error) {
      throw new KakaoLoginError(
        KakaoLoginErrorCode.SupabaseSignInFailed,
        `Supabase sign-in failed: ${error.message}`,
      );
    }

    if (!data?.user) {
      throw new KakaoLoginError(
        KakaoLoginErrorCode.SupabaseUserMissing,
        'Supabase did not return user information.',
      );
    }

    await executePostLogin(data.user, buildKakaoMetadata(data.user));
  } catch (error) {
    if (error instanceof KakaoLoginError) {
      throw error;
    }

    console.error('❌ === 카카오 로그인 에러 ===', error);
    throw new KakaoLoginError(
      KakaoLoginErrorCode.Unknown,
      'Kakao Sign In failed unexpectedly.',
    );
  }
};

