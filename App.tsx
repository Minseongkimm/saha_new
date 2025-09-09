/**
 * Saha React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import 'react-native-url-polyfill/auto';
import React, { useEffect, useState } from 'react';
import { StatusBar, useColorScheme, Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { supabase } from './src/utils/supabaseClient';
import { Session } from '@supabase/supabase-js';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // 딥링크 처리 (네이티브 SDK용 - 간단한 처리)
  const handleDeepLink = async (url: string) => {
    console.log('🔗 === 딥링크 수신 ===', url);
    
    // 네이티브 SDK에서는 대부분 자동으로 처리되므로 간단한 로깅만
    if (url.includes('saha://')) {
      console.log('✅ === 앱 딥링크 감지 ===');
      // 네이티브 SDK가 자동으로 처리하므로 추가 작업 불필요
    }
  };
  // 앱 초기화
  useEffect(() => {
    console.log('🔥 === App.tsx useEffect 시작 ===');
   
    // 앱이 처음 시작될 때 초기 세션 확인
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      console.log('🚀 === 앱 시작 - 초기 세션 확인 ===');
      
      if (initialSession) {
        console.log('✅ === 기존 세션 발견 ===');
        console.log('  - User ID:', initialSession.user.id);
        console.log('  - Email:', initialSession.user.email);
        console.log('  - Provider:', initialSession.user.app_metadata?.provider);
      } else {
        console.log('❌ === 기존 세션 없음 - 로그인 필요 ===');
      }
      
      setSession(initialSession);
      setLoading(false);
    });

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      console.log('🔄 === 인증 상태 변경 ===', _event);
      
      if (currentSession) {
        console.log('✅ === 로그인 성공 ===');
        console.log('  - User ID:', currentSession.user.id);
        console.log('  - Email:', currentSession.user.email);
        console.log('  - Provider:', currentSession.user.app_metadata?.provider);
      } else {
        console.log('❌ === 로그아웃 ===');
      }
      
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

