import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../constants/colors';
import HomeScreen from '../screens/saju/HomeScreen';
import ChatListScreen from '../screens/chat/ChatListScreen';
import MyInfoScreen from '../screens/user/MyInfoScreen';
import { isIPad } from '../utils/platform';

const IS_IPAD = isIPad();

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_SMALL_DEVICE: boolean = SCREEN_HEIGHT < 700;
const BASE_TAB_BAR_HEIGHT: number = IS_IPAD ? 95 : (IS_SMALL_DEVICE ? 62 : 82);
const TAB_BAR_PADDING_TOP: number = IS_IPAD ? 10 : 5;

const Tab = createBottomTabNavigator();

const BottomTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
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
          fontSize: IS_IPAD ? 16 : 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: '홈',
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" size={IS_IPAD ? 32 : 24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatListScreen}
        options={{
          tabBarLabel: '대화',
          tabBarIcon: ({ color, size }) => (
            <Icon name="chatbox" size={IS_IPAD ? 32 : 24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MyInfo"
        component={MyInfoScreen}
        options={{
          tabBarLabel: '내정보',
          tabBarIcon: ({ color, size }) => (
            <Icon name="person" size={IS_IPAD ? 32 : 24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};



export default BottomTabNavigator;
