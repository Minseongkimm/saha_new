import { login as kakaoLogin } from '@react-native-seoul/kakao-login';

import { supabase } from '../database/supabaseClient';
import { executePostLogin } from './login_finalizer';

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

    await executePostLogin(data.user, { login_provider: 'kakao' });
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

