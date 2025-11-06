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

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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
      if (error) {
        console.error('세션 조회 오류:', error);
      }
      setSession(initialSession);
      setLoading(false);
    });

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
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

