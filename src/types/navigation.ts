export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  MainTabs: undefined;
  BannerDetail: undefined;
  ExpertDetail: { expert: any };
  ChatRoom: { roomId: string; expert: any };
  SajuInfo: undefined;
  NotificationSettings: undefined;
  JeongtongSaju: undefined;
  TodayFortune: undefined;
  NewYearFortune: undefined;
  Loading: undefined;
  // Charge: undefined; // 결제 기능 임시 비활성화
  BirthInfo: { userId?: string; redirectTo?: string };
  PartnerInput: { expertId: string };
  Terms: { type: 'terms' | 'privacy' };
  ContactSupport: undefined;
};

export type NavigationProps = {
  navigation: any;
  route: any;
};
