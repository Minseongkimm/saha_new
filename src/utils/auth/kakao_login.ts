import { login as kakaoLogin, logout as kakaoLogout } from '@react-native-seoul/kakao-login';

import AsyncStorage from '@react-native-async-storage/async-storage';
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

// AsyncStorage가 없는 경우를 대비해 더미 값으로 폴더를 생성
const ensureAsyncStorageReady = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem('__kakao_storage_check', '1');
  } catch (error) {
    // 폴더 생성 실패는 무시 (최초 1회 오류 케이스)
    try {
      await AsyncStorage.getAllKeys();
    } catch {
      // 여전히 실패해도 흐름 중단 없음
    }
  }
};

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
    // AsyncStorage 경로를 선제 생성해 세션 저장 실패를 방지
    await ensureAsyncStorageReady();

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

    // AsyncStorage 디렉토리 오류는 세션/사용자 확인 후 처리
    const errorMessage = error instanceof Error ? error.message : String(error);
    const lowerMsg = errorMessage.toLowerCase();
    const isFolderMissing =
      lowerMsg.includes('folder') &&
      (lowerMsg.includes("doesn't exist") || lowerMsg.includes('doesn’t exist') || lowerMsg.includes('nsposixerrordomain code=2'));
    if (isFolderMissing) {
      // 폴더 생성 실패 시 세션/사용자를 다시 확인
      const { data: userResult } = await supabase.auth.getUser();
      if (userResult?.user) {
        // 세션/사용자가 있으면 후처리까지 진행 후 정상 종료
        await executePostLogin(userResult.user, buildKakaoMetadata(userResult.user));
        return;
      }
      // 세션/사용자가 없으면 오류로 처리
      return;
    }

    console.error('❌ === 카카오 로그인 에러 ===', error);
    throw new KakaoLoginError(
      KakaoLoginErrorCode.Unknown,
      'Kakao Sign In failed unexpectedly.',
    );
  }
};

export const performKakaoLogout = async (): Promise<void> => {
  try {
    await kakaoLogout();
  } catch (error) {
    // Kakao 로그아웃 실패는 치명적이지 않으므로 에러를 무시
    // (이미 로그아웃된 상태이거나 세션이 없는 경우 등)
    console.warn('⚠️ === Kakao logout warning ===', error);
  }
};

