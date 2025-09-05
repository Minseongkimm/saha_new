import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../constants/colors';
import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/ChatScreen';
import MyInfoScreen from '../screens/MyInfoScreen';

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
          paddingBottom: 20, 
          paddingTop: 10,   
          height: 80,        
        },
        tabBarActiveTintColor: Colors.primaryColor, 
        tabBarInactiveTintColor: '#757575', 
        tabBarLabelStyle: {
          fontSize: 12,
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
            <Icon name="home" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarLabel: '대화',
          tabBarIcon: ({ color, size }) => (
            <Icon name="chatbox" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MyInfo"
        component={MyInfoScreen}
        options={{
          tabBarLabel: '내정보',
          tabBarIcon: ({ color, size }) => (
            <Icon name="person" size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};



export default BottomTabNavigator;
