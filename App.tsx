/**
 * Saha React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import React, { useEffect, useState } from 'react';
import { StatusBar, useColorScheme, Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { supabase } from './src/utils/database/supabaseClient';
import { Session } from '@supabase/supabase-js';
import { initIAP } from './src/utils/payments/iapClient';
import { AppConfigProvider } from './src/contexts/AppConfigContext';
import { registerPushToken, subscribeTokenRefresh } from './src/services/notifications/pushTokenService';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialAuthRouteName, setInitialAuthRouteName] = useState<'MainTabs' | 'BirthInfo' | 'Loading'>('MainTabs');

  // 딥링크 처리 (네이티브 SDK용 - 간단한 처리)
  // 네이티브 SDK가 자동으로 처리하므로 추가 작업 불필요
  const handleDeepLink = async (url: string) => {
    if (url.includes('saha://')) {
    }
  };
  // 앱 초기화
  useEffect(() => {
    // 앱이 처음 시작될 때 초기 세션 확인
    // Android에서 세션 복원이 늦을 수 있으므로 명시적으로 처리
    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      // 리프레시 토큰이 없는 경우는 정상적인 상황 (로그인하지 않은 상태)
      // 이 오류는 조용히 처리
      if (error && error.message !== 'Invalid Refresh Token: Refresh Token Not Found') {
        console.error('세션 조회 오류:', error);
      }
      setSession(initialSession);
      setLoading(false);
    });

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      // 사용자가 방금 로그인한 경우에만 BirthInfo 유무를 검사하여 초기 라우트 결정
      if (event === 'SIGNED_IN' && currentSession?.user) {
        // 먼저 인증 스택을 'Loading'으로 진입시켜 깜빡임 방지
        setInitialAuthRouteName('Loading');
        try {
          const { data } = await supabase
            .from('birth_info')
            .select('id')
            .eq('user_id', currentSession.user.id)
            .single();
          setInitialAuthRouteName(data ? 'MainTabs' : 'BirthInfo');
        } catch {
          setInitialAuthRouteName('MainTabs');
        }
      } else if (event === 'SIGNED_OUT') {
        setInitialAuthRouteName('MainTabs');
      }
    });

    // 딥링크 리스너 (네이티브 SDK용)
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // 앱이 닫혀있다가 딥링크로 열릴 때 처리
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    }).catch((error) => {
      console.error('❌ === 초기 URL 확인 중 오류 ===', error);
    });

    // IAP 초기화 (인앱결제)
    initIAP().catch((error) => {
      console.error('IAP 초기화 실패:', error);
      // IAP 초기화 실패해도 앱은 정상 작동
    });

    return () => {
      subscription.unsubscribe();
      linkingSubscription?.remove();
    };
  }, []);

  // 로그인된 유저의 FCM 푸시 토큰 등록 및 갱신 구독
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) {
      return;
    }

    registerPushToken(userId).catch(error => {
      console.error('푸시 토큰 등록 중 오류:', error);
    });

    const unsubscribe = subscribeTokenRefresh(userId);
    return unsubscribe;
  }, [session?.user?.id]);

  if (loading) {
    return null; // 로딩 중
  }

  return (
    <SafeAreaProvider>
      <AppConfigProvider>
        <StatusBar 
          barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
          backgroundColor="#007AFF"
        />
        <AppNavigator session={session} initialAuthRouteName={initialAuthRouteName} />
      </AppConfigProvider>
    </SafeAreaProvider>
  );
}
export default App;

