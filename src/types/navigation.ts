export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  MainTabs: undefined;
  BannerDetail: undefined;
  ExpertDetail: { expert: any };
  ChatRoom: { expert: any };
  SajuInfo: undefined;
  NotificationSettings: undefined;
  Charge: undefined;
  BirthInfo: { userId: string };
};

export type NavigationProps = {
  navigation: any;
  route: any;
};
