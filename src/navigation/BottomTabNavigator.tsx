import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Dimensions, BackHandler, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../constants/colors';
import HomeScreen from '../screens/saju/HomeScreen';
import ChatRoomScreen from '../screens/chat/ChatRoomScreen';
import StoreWebViewScreen, { markStoreWebViewT0 } from '../screens/store/StoreWebViewScreen';
import StoreWebViewPreloader from '../screens/store/StoreWebViewPreloader';
import StoreWebViewNetworkWarmup from '../screens/store/StoreWebViewNetworkWarmup';
import {
  ENABLE_STORE_TAB_LAZY,
  ENABLE_STORE_WEBVIEW_NETWORK_WARMUP,
  ENABLE_STORE_WEBVIEW_PRELOAD,
} from '../screens/store/storeWebViewConfig';
import MyInfoScreen from '../screens/user/MyInfoScreen';
import { isIPad } from '../utils/platform';

const IS_IPAD = isIPad();

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_SMALL_DEVICE: boolean = SCREEN_HEIGHT < 700;
const BASE_TAB_BAR_HEIGHT: number = IS_IPAD ? 95 : (IS_SMALL_DEVICE ? 62 : 82);
const TAB_BAR_PADDING_TOP: number = IS_IPAD ? 10 : 5;
// 탭 4개가 작은 화면에서 잘리지 않도록 아이콘/라벨 크기 조정
const TAB_ICON_SIZE: number = IS_IPAD ? 32 : (IS_SMALL_DEVICE ? 20 : 24);
const TAB_LABEL_FONT_SIZE: number = IS_IPAD ? 16 : (IS_SMALL_DEVICE ? 10 : 12);

const Tab = createBottomTabNavigator();

const BottomTabNavigator: React.FC = () => {
  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS === 'android') {
        const onBackPress = () => {
          // MainTabs 화면에서 뒤로가기를 눌렀을 때 앱 종료 방지
          return true;
        };

        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

        return () => subscription.remove();
      }
    }, [])
  );

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#E0E0E0',
            paddingTop: TAB_BAR_PADDING_TOP,
            height: BASE_TAB_BAR_HEIGHT,
          },
          tabBarLabelPosition: 'below-icon',
          tabBarIconStyle: {
            marginBottom: IS_IPAD ? 8 : 0,
          },
          tabBarActiveTintColor: Colors.primaryColor, 
          tabBarInactiveTintColor: '#757575', 
          tabBarLabelStyle: {
            fontSize: TAB_LABEL_FONT_SIZE,
            fontWeight: '600',
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarLabel: '홈',
            tabBarIcon: ({ color }) => (
              <Icon name="home" size={TAB_ICON_SIZE} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Chat"
          component={ChatRoomScreen}
          initialParams={{ directEntry: true }}
          options={{
            tabBarLabel: '대화',
            tabBarIcon: ({ color }) => (
              <Icon name="chatbox" size={TAB_ICON_SIZE} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Store"
          component={StoreWebViewScreen}
          listeners={{
            tabPress: () => {
              markStoreWebViewT0('tab_press_store_tab');
            },
          }}
          options={{
            lazy: ENABLE_STORE_TAB_LAZY,
            tabBarLabel: '상점',
            tabBarIcon: ({ color }) => (
              <Icon name="storefront" size={TAB_ICON_SIZE} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="MyInfo"
          component={MyInfoScreen}
          options={{
            tabBarLabel: '내정보',
            tabBarIcon: ({ color }) => (
              <Icon name="person" size={TAB_ICON_SIZE} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
      {ENABLE_STORE_WEBVIEW_PRELOAD ? <StoreWebViewPreloader /> : null}
      {ENABLE_STORE_WEBVIEW_NETWORK_WARMUP ? <StoreWebViewNetworkWarmup /> : null}
    </>
  );
};



export default BottomTabNavigator;
