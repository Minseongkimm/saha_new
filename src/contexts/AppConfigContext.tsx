/**
 * 앱 설정 Context
 * mindfulness 문구 사용 여부 등을 전역으로 관리
 */
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { shouldUseMindfulnessTerms } from '../utils/config/appConfig';

interface AppConfigContextType {
  useMindfulnessTerms: boolean;
  isLoading: boolean;
  refreshConfig: () => Promise<void>;
}

const AppConfigContext = createContext<AppConfigContextType>({
  useMindfulnessTerms: false,
  isLoading: true,
  refreshConfig: async () => {},
});

interface AppConfigProviderProps {
  children: ReactNode;
}

export const AppConfigProvider: React.FC<AppConfigProviderProps> = ({ children }) => {
  const [useMindfulnessTerms, setUseMindfulnessTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadConfig = async (forceRefresh: boolean = false) => {
    try {
      const shouldUse = await shouldUseMindfulnessTerms(forceRefresh);
      setUseMindfulnessTerms(shouldUse);
    } catch (error) {
      console.error('앱 설정 조회 실패:', error);
      // 기본값: false
      setUseMindfulnessTerms(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // 앱이 포그라운드로 돌아올 때 설정 새로고침 (iOS만)
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    // iOS에서만 적용
    if (Platform.OS !== 'ios') {
      return;
    }

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // 앱이 포그라운드로 돌아올 때 설정 새로고침
        loadConfig(true);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const refreshConfig = async () => {
    setIsLoading(true);
    await loadConfig(true);
  };

  return (
    <AppConfigContext.Provider value={{ useMindfulnessTerms, isLoading, refreshConfig }}>
      {children}
    </AppConfigContext.Provider>
  );
};

export const useAppConfig = (): AppConfigContextType => {
  const context = useContext(AppConfigContext);
  if (!context) {
    throw new Error('useAppConfig must be used within AppConfigProvider');
  }
  return context;
};

