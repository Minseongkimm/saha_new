import { Platform } from 'react-native';
import appleAuth, { AppleError } from '@invertase/react-native-apple-authentication';
import type { AppleRequestResponse } from '@invertase/react-native-apple-authentication';

import { supabase } from '../database/supabaseClient';
import { executePostLogin, LoginMetadata } from './login_finalizer';

export enum AppleLoginErrorCode {
  Unsupported = 'unsupported',
  IdentityTokenMissing = 'identity_token_missing',
  SupabaseSignInFailed = 'supabase_sign_in_failed',
  SupabaseUserMissing = 'supabase_user_missing',
  Cancelled = 'cancelled',
  Unknown = 'unknown',
}

export class AppleLoginError extends Error {
  public readonly code: AppleLoginErrorCode;

  constructor(code: AppleLoginErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

const buildAppleMetadata = (response: AppleRequestResponse): LoginMetadata => {
  const payload: LoginMetadata = {
    login_provider: 'apple',
    apple_user_identifier: response.user,
  };

  if (response.email) {
    payload.apple_email = response.email;
  }

  const givenName = response.fullName?.givenName ?? '';
  const familyName = response.fullName?.familyName ?? '';
  const fullName = [familyName, givenName].filter(value => value.length > 0).join(' ').trim();

  if (fullName.length > 0) {
    payload.name = fullName;
  }

  return payload;
};

const isAppleNativeError = (error: unknown): error is { code: string } => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  return 'code' in (error as Record<string, unknown>);
};

const MIN_SUPPORTED_IOS_VERSION = 13;

const getIOSVersionNumber = (): number => {
  if (Platform.OS !== 'ios') {
    return 0;
  }
  const version = Number.parseFloat(String(Platform.Version));
  return Number.isNaN(version) ? 0 : version;
};

// 애플 로그인 지원 기기인지 확인
export const isAppleSignInSupported = (): boolean => {
  const iosVersion = getIOSVersionNumber();
  if (iosVersion < MIN_SUPPORTED_IOS_VERSION) {
    return false;
  }
  return Platform.OS === 'ios' && appleAuth.isSupported;
};

// 애플 로그인 지원 조건(플랫폼/버전/모듈) 검사
const ensureAppleSignInSupported = (): void => {
  if (Platform.OS !== 'ios') {
    throw new AppleLoginError(
      AppleLoginErrorCode.Unsupported,
      'Apple Sign In is only available on iOS devices.',
    );
  }

  const iosVersion = getIOSVersionNumber();
  if (iosVersion < MIN_SUPPORTED_IOS_VERSION) {
    throw new AppleLoginError(
      AppleLoginErrorCode.Unsupported,
      'Apple Sign In requires iOS 13 or later.',
    );
  }

  if (!appleAuth.isSupported) {
    throw new AppleLoginError(
      AppleLoginErrorCode.Unsupported,
      'Apple Sign In is not supported on this device.',
    );
  }
};

// 애플 로그인 요청을 수행하고 Supabase 인증까지 완료
export const performAppleLogin = async (): Promise<void> => {
  ensureAppleSignInSupported();

  try {
    const response = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation?.LOGIN ?? 1,
      requestedScopes: [
        appleAuth.Scope?.EMAIL ?? 0,
        appleAuth.Scope?.FULL_NAME ?? 1,
      ],
    });

    if (!response.identityToken) {
      throw new AppleLoginError(
        AppleLoginErrorCode.IdentityTokenMissing,
        'Unable to obtain Apple identity token.',
      );
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: response.identityToken,
      nonce: response.nonce ?? undefined,
    });

    if (error) {
      throw new AppleLoginError(
        AppleLoginErrorCode.SupabaseSignInFailed,
        `Supabase sign-in failed: ${error.message}`,
      );
    }

    if (!data?.user) {
      throw new AppleLoginError(
        AppleLoginErrorCode.SupabaseUserMissing,
        'Supabase did not return user information.',
      );
    }

    // Apple 로그인 메타데이터 생성
    const appleMetadata = buildAppleMetadata(response);
    
    // Apple은 첫 로그인 시에만 이름을 제공하고, 두 번째 로그인부터는 제공하지 않음
    // 이름은 birth_info.name에서 관리하고, 없을 때만 fallback으로 "여행객" 표시

    await executePostLogin(data.user, appleMetadata);
  } catch (error) {
    if (error instanceof AppleLoginError) {
      throw error;
    }

    if (isAppleNativeError(error)) {
      const nativeErrorCode = (error as { code: string }).code;

      if (nativeErrorCode === AppleError.CANCELED) {
        throw new AppleLoginError(AppleLoginErrorCode.Cancelled, 'User cancelled Apple Sign In.');
      }

      if (nativeErrorCode === AppleError.NOT_HANDLED) {
        throw new AppleLoginError(
          AppleLoginErrorCode.Unsupported,
          'Apple Sign In is not supported on this device.',
        );
      }

      throw new AppleLoginError(
        AppleLoginErrorCode.Unknown,
        `Apple Sign In failed: ${nativeErrorCode}`,
      );
    }

    console.error('❌ === Apple 로그인 에러 ===', error);
    throw new AppleLoginError(AppleLoginErrorCode.Unknown, 'Apple Sign In failed unexpectedly.');
  }
};

