/**
 * Saha React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import 'react-native-url-polyfill/auto';
import React, { useEffect, useState } from 'react';
import { StatusBar, useColorScheme, Linking, AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppNavigator from './src/navigation/AppNavigator';
import { supabase } from './src/utils/supabaseClient';
import { Session } from '@supabase/supabase-js';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // OAuth 콜백 처리
  const handleOAuthCallback = async (url: string) => {
    console.log('🔗 === OAuth 콜백 수신 ===');
    console.log('📍 전체 URL:', url);
    
    if (url.includes('saha://auth/callback')) {
      console.log('✅ === OAuth 콜백 처리 시작 ===');
      
      try {
        // 개선된 URL 파싱 사용
        let parsedUrl: URL;
        try {
          parsedUrl = new URL(url);
        } catch (urlError) {
          console.error('❌ === URL 파싱 실패 ===', urlError);
          return;
        }

        console.log('🔍 === URL 구조 분석 ===');
        console.log('  - Protocol:', parsedUrl.protocol);
        console.log('  - Host:', parsedUrl.host);
        console.log('  - Pathname:', parsedUrl.pathname);
        console.log('  - Search:', parsedUrl.search);
        console.log('  - Hash:', parsedUrl.hash);

        // URL에서 매개변수 추출 (hash와 search 모두 확인)
        const hashParams = parsedUrl.hash ? new URLSearchParams(parsedUrl.hash.substring(1)) : null;
        const searchParams = new URLSearchParams(parsedUrl.search);
        
        console.log('🔍 === URL 매개변수 파싱 ===');
        console.log('  - Hash params:', hashParams ? Object.fromEntries(hashParams.entries()) : 'none');
        console.log('  - Search params:', Object.fromEntries(searchParams.entries()));
        
        // 이미 교환된 토큰 확인 (딥링크에서 직접 받은 경우)
        const accessToken = hashParams?.get('access_token') || searchParams.get('access_token');
        const refreshToken = hashParams?.get('refresh_token') || searchParams.get('refresh_token');
        const expiresIn = hashParams?.get('expires_in') || searchParams.get('expires_in');
        const tokenType = hashParams?.get('token_type') || searchParams.get('token_type');
        const providerToken = hashParams?.get('provider_token') || searchParams.get('provider_token');
        const providerRefreshToken = hashParams?.get('provider_refresh_token') || searchParams.get('provider_refresh_token');
        
        console.log('🔑 === 추출된 토큰 정보 ===');
        console.log('  - Access Token:', accessToken ? `존재 (${accessToken.substring(0, 20)}...)` : 'missing');
        console.log('  - Refresh Token:', refreshToken ? `존재 (${refreshToken.substring(0, 20)}...)` : 'missing');
        console.log('  - Provider Token:', providerToken ? `존재 (${providerToken.substring(0, 20)}...)` : 'missing');
        console.log('  - Provider Refresh Token:', providerRefreshToken ? `존재 (${providerRefreshToken.substring(0, 20)}...)` : 'missing');
        console.log('  - Expires In:', expiresIn);
        console.log('  - Token Type:', tokenType);

        if (accessToken && refreshToken) {
          console.log('🔧 === 세션 설정 시작 (이미 교환된 토큰) ===');
          
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('❌ === 세션 설정 오류 ===', error);
            console.error('  - Error message:', error.message);
            console.error('  - Error details:', JSON.stringify(error, null, 2));
            return;
          }

          if (data.session) {
            console.log('🎉 === 세션 설정 성공 ===');
            console.log('  - Access Token (처음 20자):', data.session.access_token.substring(0, 20) + '...');
            console.log('  - Refresh Token (처음 20자):', data.session.refresh_token.substring(0, 20) + '...');
            console.log('  - Expires At:', new Date(data.session.expires_at! * 1000).toISOString());
            
            // 유저 정보 상세 출력
            if (data.session.user) {
              console.log('👤 === 유저 정보 ===');
              console.log('  - User ID:', data.session.user.id);
              console.log('  - Email:', data.session.user.email);
              console.log('  - Provider:', data.session.user.app_metadata?.provider);
              console.log('  - Email Confirmed:', data.session.user.email_confirmed_at);
              console.log('  - Created At:', data.session.user.created_at);
              console.log('  - Last Sign In:', data.session.user.last_sign_in_at);
              console.log('  - Full User Data:', JSON.stringify(data.session.user, null, 2));
              
              // 카카오 관련 정보
              if (data.session.user.user_metadata) {
                console.log('🍃 === 카카오 유저 메타데이터 ===');
                console.log('  - User Metadata:', JSON.stringify(data.session.user.user_metadata, null, 2));
              }
              
              if (data.session.user.identities && data.session.user.identities.length > 0) {
                console.log('🔗 === 연결된 계정 정보 ===');
                data.session.user.identities.forEach((identity, index) => {
                  console.log(`  - Identity ${index + 1}:`, JSON.stringify(identity, null, 2));
                });
              }
            }
            
            // onAuthStateChange가 자동으로 호출되어 상태가 업데이트됩니다
          }
        } else {
          // Authorization Code 확인 (토큰 교환이 필요한 경우)
          const authCode = hashParams?.get('code') || searchParams.get('code');
          
          console.log('🔍 === Authorization Code 확인 ===');
          console.log('  - Code:', authCode ? `존재 (${authCode.substring(0, 20)}...)` : 'missing');
          
          if (authCode) {
            console.log('🔄 === Authorization Code를 Access Token으로 교환 시작 ===');
            
            try {
              const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);
              
              if (error) {
                console.error('❌ === 코드 교환 실패 ===', error);
                console.error('  - Error message:', error.message);
                console.error('  - Error details:', JSON.stringify(error, null, 2));
              } else if (data.session) {
                console.log('✅ === 코드 교환 성공! ===');
                console.log('  - User ID:', data.session.user.id);
                console.log('  - Email:', data.session.user.email);
                console.log('  - Provider:', data.session.user.app_metadata?.provider);
                console.log('  - Access Token (처음 20자):', data.session.access_token.substring(0, 20) + '...');
                console.log('  - Refresh Token (처음 20자):', data.session.refresh_token.substring(0, 20) + '...');
                
                if (data.session.user.user_metadata) {
                  console.log('🍃 === 카카오 유저 메타데이터 ===');
                  console.log('  - User Metadata:', JSON.stringify(data.session.user.user_metadata, null, 2));
                }
                
                // onAuthStateChange가 자동으로 호출되어 상태가 업데이트됩니다
              }
            } catch (exchangeError) {
              console.error('💥 === 코드 교환 예외 ===', exchangeError);
              console.error('  - Exception message:', exchangeError instanceof Error ? exchangeError.message : 'Unknown exception');
              console.error('  - Exception stack:', exchangeError instanceof Error ? exchangeError.stack : 'No stack trace');
            }
          } else {
            console.error('❌ === OAuth 콜백에서 필요한 토큰과 코드 모두 찾을 수 없음 ===');
            console.log('🔍 모든 URL 파라미터:');
            console.log('  - Hash params:', hashParams ? Object.fromEntries(hashParams.entries()) : 'none');
            console.log('  - Search params:', Object.fromEntries(searchParams.entries()));
          }
        }
      } catch (error) {
        console.error('💥 === OAuth 콜백 처리 예외 ===', error);
        console.error('  - Exception message:', error instanceof Error ? error.message : 'Unknown exception');
        console.error('  - Exception stack:', error instanceof Error ? error.stack : 'No stack trace');
      }
    } else {
      console.log('ℹ️ OAuth 콜백이 아닌 딥링크:', url);
    }
  };



  // AsyncStorage 디버깅 함수
  const checkAsyncStorage = async () => {
    console.log('🗄️ === AsyncStorage 내용 확인 시작 ===');
    try {
      const keys = await AsyncStorage.getAllKeys();
      console.log('📋 === AsyncStorage Keys ===');
      console.log('  - Total keys:', keys.length);
      console.log('  - Keys:', keys);
      
      // Supabase 관련 키 필터링
      const supabaseKeys = keys.filter(key => key.includes('supabase') || key.includes('auth') || key.includes('session'));
      console.log('🔑 === Supabase 관련 Keys ===');
      console.log('  - Supabase keys:', supabaseKeys);
      
      // 각 Supabase 관련 데이터 확인
      for (const key of supabaseKeys) {
        try {
          const value = await AsyncStorage.getItem(key);
          console.log(`📦 === ${key} ===`);
          console.log('  - Raw value:', value);
          
          // JSON 파싱 시도
          if (value) {
            try {
              const parsed = JSON.parse(value);
              console.log('  - Parsed value:', JSON.stringify(parsed, null, 2));
            } catch (parseError) {
              console.log('  - Not JSON, raw string:', value.substring(0, 100) + (value.length > 100 ? '...' : ''));
            }
          }
        } catch (itemError) {
          console.error(`❌ === ${key} 읽기 실패 ===`, itemError);
        }
      }
    } catch (error) {
      console.error('❌ === AsyncStorage 확인 중 오류 ===', error);
    }
    console.log('🗄️ === AsyncStorage 내용 확인 완료 ===\n');
  };

  // 앱 초기화
  useEffect(() => {
    console.log('🔥 === App.tsx useEffect 시작 ===');
    
    // AsyncStorage 내용 확인 (디버깅용)
    checkAsyncStorage();
    
    // 앱이 처음 시작될 때 초기 세션 확인
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      console.log('🚀 === 앱 시작 - 초기 세션 확인 ===');
      
      if (initialSession) {
        console.log('✅ === 기존 세션 발견 ===');
        console.log('  - User ID:', initialSession.user.id);
        console.log('  - Email:', initialSession.user.email);
        console.log('  - Provider:', initialSession.user.app_metadata?.provider);
        console.log('  - Session Expires:', new Date(initialSession.expires_at! * 1000).toISOString());
        
        if (initialSession.user.user_metadata) {
          console.log('🍃 === 초기 유저 메타데이터 ===');
          console.log('  - User Metadata:', JSON.stringify(initialSession.user.user_metadata, null, 2));
        }
      } else {
        console.log('❌ === 기존 세션 없음 - 로그인 필요 ===');
      }
      
      setSession(initialSession);
      setLoading(false);
    });

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      console.log('🔄 === 인증 상태 변경 ===');
      console.log('  - Event:', _event);
      console.log('  - Has Session:', !!currentSession);
      
      if (currentSession) {
        console.log('📊 === 현재 세션 정보 ===');
        console.log('  - User ID:', currentSession.user.id);
        console.log('  - Email:', currentSession.user.email);
        console.log('  - Provider:', currentSession.user.app_metadata?.provider);
        console.log('  - Session Expires:', new Date(currentSession.expires_at! * 1000).toISOString());
        
        if (currentSession.user.user_metadata) {
          console.log('🍃 === 현재 유저 메타데이터 ===');
          console.log('  - User Metadata:', JSON.stringify(currentSession.user.user_metadata, null, 2));
        }
      } else {
        console.log('❌ === 세션 없음 (로그아웃 상태) ===');
      }
      
      setSession(currentSession);
    });

    // 딥링크 리스너 (OAuth 콜백 처리)
    console.log('🎧 === 딥링크 리스너 등록 시작 ===');
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      console.log('📱 ===== 딥링크 이벤트 수신 =====');
      console.log('📱 수신된 URL:', url);
      console.log('📱 현재 시간:', new Date().toISOString());
      handleOAuthCallback(url);
    });
    console.log('✅ === 딥링크 리스너 등록 완료 ===');

    // 앱이 닫혀있다가 딥링크로 열릴 때 처리
    console.log('🔍 === 초기 URL 확인 시작 ===');
    Linking.getInitialURL().then((url) => {
      console.log('🔍 === 앱 시작시 초기 URL 확인 결과 ===', url);
      if (url) {
        console.log('🎯 === 초기 URL로 OAuth 콜백 처리 시작 ===');
        handleOAuthCallback(url);
      } else {
        console.log('ℹ️ === 초기 URL 없음 (일반 앱 시작) ===');
      }
    }).catch((error) => {
      console.error('❌ === 초기 URL 확인 중 오류 ===', error);
    });

    // 앱 상태 변경 리스너 (포그라운드 복귀 시 세션 재확인)
    const handleAppStateChange = (nextAppState: string) => {
      console.log('📱 === 앱 상태 변경 ===', nextAppState);
      
      if (nextAppState === 'active') {
        console.log('🔄 === 앱이 포그라운드로 복귀 - 세션 재확인 ===');
        // 딥링크 문제 해결을 위해 세션을 다시 확인
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
          if (currentSession && !session) {
            console.log('🎉 === 포그라운드 복귀 시 새로운 세션 발견! ===');
            console.log('  - User ID:', currentSession.user.id);
            console.log('  - Email:', currentSession.user.email);
            console.log('  - Provider:', currentSession.user.app_metadata?.provider);
            setSession(currentSession);
          }
        }).catch((sessionError) => {
          console.error('❌ === 포그라운드 복귀 시 세션 확인 오류 ===', sessionError);
        });
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.unsubscribe();
      linkingSubscription?.remove();
      appStateSubscription?.remove();
    };
  }, []);

  if (loading) {
    return null; // 로딩 중
  }

  return (
    <SafeAreaProvider>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
        backgroundColor="#007AFF"
      />
      <AppNavigator session={session} />
    </SafeAreaProvider>
  );
}
export default App;

