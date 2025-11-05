import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Image, View, Platform } from 'react-native';
import { Session } from '@supabase/supabase-js';

import SplashScreen from '../screens/entry/SplashScreen';
import BottomTabNavigator from './BottomTabNavigator';
import BannerDetailScreen from '../screens/expert/BannerDetailScreen';
import ExpertDetailScreen from '../screens/expert/ExpertDetailScreen';
import ChatRoomScreen from '../screens/chat/ChatRoomScreen';
import SajuInfoScreen from '../screens/saju/SajuInfoScreen';
import NotificationSettingsScreen from '../screens/user/NotificationSettingsScreen';
import TraditionalSajuScreen from '../screens/saju/TraditionalSajuScreen';
import TodayFortuneScreen from '../screens/saju/TodayFortuneScreen';
import NewYearFortuneScreen from '../screens/saju/NewYearFortuneScreen';
import LoadingScreen from '../screens/common/LoadingScreen';
import BirthInfoScreen from '../screens/saju/BirthInfoScreen';
import PartnerInputScreen from '../screens/partner/PartnerInputScreen';
import TermsScreen from '../screens/user/TermsScreen';
import { RootStackParamList } from '../types/navigation';
import LoginScreen from '../screens/entry/LoginScreen';

const Stack = createStackNavigator<RootStackParamList>();

interface AppNavigatorProps {
  session: Session | null;
}

const AppNavigator: React.FC<AppNavigatorProps> = ({ session }) => {
  const [isLoading, setIsLoading] = useState(true);

  const handleSplashFinish = () => {
    setIsLoading(false);
  };

  if (isLoading) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#FFFFFFFF',
            borderBottomWidth: 0,
            shadowOpacity: 0,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerTitleAlign: 'center',
        }}
        initialRouteName={session ? 'MainTabs' : 'Login'}
      >
        <Stack.Screen
          name="Terms"
          component={TermsScreen}
          options={{
            headerShown: false,
          }}
        />
        
        {session ? (
          <>
            <Stack.Screen
              name="MainTabs"
              component={BottomTabNavigator}
              options={{
                headerTitle: () => (
                  <View style={{ 
                    flex: 1, 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    ...(Platform.OS === 'android' && { position: 'absolute', left: 0, right: 0 })
                  }}>
                    <Image
                      source={require('../../assets/logo/logo_icon.png')}
                      style={{ width: 40, height: 40, resizeMode: 'contain' }}
                    />
                  </View>
                ),
                headerTitleAlign: 'center',
                headerStyle: {
                  borderBottomWidth: 0,
                  elevation: 0,
                  shadowOpacity: 0,
                },
              }}
            />
            <Stack.Screen
              name="BirthInfo"
              component={BirthInfoScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="PartnerInput"
              component={PartnerInputScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="BannerDetail"
              component={BannerDetailScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="ExpertDetail"
              component={ExpertDetailScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="ChatRoom"
              component={ChatRoomScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="SajuInfo"
              component={SajuInfoScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="NotificationSettings"
              component={NotificationSettingsScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="JeongtongSaju"
              component={TraditionalSajuScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="TodayFortune"
              component={TodayFortuneScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="NewYearFortune"
              component={NewYearFortuneScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="Loading"
              component={LoadingScreen}
              options={{
                headerShown: false,
              }}
            />
          </>
        ) : (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{
              headerShown: false,
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
