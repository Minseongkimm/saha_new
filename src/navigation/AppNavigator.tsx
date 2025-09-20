import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Image } from 'react-native';
import { Session } from '@supabase/supabase-js';

import SplashScreen from '../screens/SplashScreen';
import BottomTabNavigator from './BottomTabNavigator';
import BannerDetailScreen from '../screens/BannerDetailScreen';
import ExpertDetailScreen from '../screens/ExpertDetailScreen';
import ChatRoomScreen from '../screens/ChatRoomScreen';
import SajuInfoScreen from '../screens/SajuInfoScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import CompatibilityScreen from '../screens/CompatibilityScreen';
import JeongtongSajuScreen from '../screens/JeongtongSajuScreen';
import TodayFortuneScreen from '../screens/TodayFortuneScreen';
import NewYearFortuneScreen from '../screens/NewYearFortuneScreen';
// import ChargeScreen from '../screens/ChargeScreen';
import BirthInfoScreen from '../screens/BirthInfoScreen';
import { RootStackParamList } from '../types/navigation';
import LoginScreen from '../screens/LoginScreen';

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
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {!session ? (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{
                headerShown: false,
              }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="MainTabs"
              component={BottomTabNavigator}
              options={{
                headerTitle: () => (
                  <Image
                    source={require('../../assets/logo/logo_icon.png')}
                    style={{ width: 40, height: 40, resizeMode: 'contain', marginBottom: 7 }}
                  />
                ),
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
              name="Compatibility"
              component={CompatibilityScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="JeongtongSaju"
              component={JeongtongSajuScreen}
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
            {/* <Stack.Screen
              name="Charge"
              component={ChargeScreen}
              options={{
                headerShown: false,
              }}
            /> */}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
