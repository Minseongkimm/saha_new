/**
 * 앱 설정 Context
 */
import React, { createContext, useContext, ReactNode } from 'react';

interface AppConfigContextType {
  isLoading: boolean;
  refreshConfig: () => Promise<void>;
}

const AppConfigContext = createContext<AppConfigContextType>({
  isLoading: false,
  refreshConfig: async () => {},
});

interface AppConfigProviderProps {
  children: ReactNode;
}

export const AppConfigProvider: React.FC<AppConfigProviderProps> = ({ children }) => {
  const refreshConfig = async () => {
    // 설정 새로고침 로직이 필요한 경우 여기에 추가
  };

  return (
    <AppConfigContext.Provider value={{ isLoading: false, refreshConfig }}>
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

