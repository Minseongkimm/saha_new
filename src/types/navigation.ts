export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  MainTabs: undefined;
  BannerDetail: undefined;
  ExpertDetail: { expert: any };
  ChatRoom: {
    roomId: string;
    expert: any;
    partnerData?: any;
    initialMessage?: string;
    infoCaptureMessage?: string;
    directMode?: boolean;
    directEntry?: boolean;
    onDirectNewChat?: () => void;
    onDirectSelectChat?: (roomId: string, expert: any) => void;
  };
  SajuInfo: undefined;
  NotificationSettings: undefined;
  JeongtongSaju: undefined;
  TodayFortune: undefined;
  NewYearFortune: undefined;
  Loading: undefined;
  // Charge: undefined; // 결제 기능 임시 비활성화
  BirthInfo: { userId?: string; redirectTo?: string; returnToChat?: RootStackParamList['ChatRoom'] };
  PartnerInput: { expertId?: string; returnToChat?: RootStackParamList['ChatRoom']; editPartnerId?: string; returnToSajuInfo?: boolean };
  Terms: { type: 'terms' | 'privacy' };
  ContactSupport: undefined;
};

export type NavigationProps = {
  navigation: any;
  route: any;
};
