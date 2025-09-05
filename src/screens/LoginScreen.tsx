import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { Colors } from '../constants/colors';
import { login, getProfile } from '@react-native-seoul/kakao-login';
import { Fonts } from '../constants/fonts';

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleKakaoLogin = async () => {
    setIsLoading(true);
    
    try {
      // TODO: 실제 카카오 로그인 구현
      console.log('카카오 로그인 시도');
      
      // 임시 로그인 성공 처리
      setTimeout(() => {
        setIsLoading(false);
        navigation.replace('MainTabs');
      }, 1000);
      
    } catch (error) {
      setIsLoading(false);
      Alert.alert('로그인 실패', '카카오 로그인에 실패했습니다.');
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    
    try {
      // TODO: 구글 로그인 API 호출
      console.log('구글 로그인 시도');
      
      // 임시 로그인 성공 처리
      setTimeout(() => {
        setIsLoading(false);
        navigation.replace('MainTabs');
      }, 1000);
      
    } catch (error) {
      setIsLoading(false);
      Alert.alert('로그인 실패', '구글 로그인에 실패했습니다.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* 상단 이미지 */}
        <View style={styles.imageContainer}>
          <Image 
            source={require('../../assets/logo/logo_icon.png')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* 중간 텍스트 */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>사바 AI</Text>
          <Text style={styles.subtitle}>당신만의 사주 길잡이</Text>
          <Text style={styles.description}>
            사주AI와 대화{'\n'}
            고민의 실마리를 드립니다
          </Text>
        </View>

        {/* 하단 로그인 버튼들 */}
        <View style={styles.loginContainer}>
          <TouchableOpacity 
            style={[styles.loginButton, styles.kakaoButton]}
            onPress={handleKakaoLogin}
            disabled={isLoading}
          >
            <View style={styles.buttonContent}>
              <Image 
                source={require('../../assets/icons/kakao_icon.png')} 
                style={styles.kakaoIcon}
                resizeMode="contain"
              />
              <Text style={styles.kakaoButtonText}>
                {isLoading ? '로그인 중' : '카카오로 로그인'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.loginButton, styles.googleButton]}
            onPress={handleGoogleLogin}
            disabled={isLoading}
          >
            <View style={styles.buttonContent}>
              <Image 
                source={require('../../assets/icons/google_icon.png')} 
                style={styles.iconImage}
                resizeMode="contain"
              />
              <Text style={styles.googleButtonText}>
                {isLoading ? '로그인 중' : '구글로 로그인'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 25,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 180,
    height: 180,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: Fonts.ssRock, // SSRockRegular 폰트 사용
  },
  subtitle: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
  description: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  loginContainer: {
    paddingBottom: 20,
  },
  loginButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconImage: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  kakaoIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
    borderRadius: 6,
  },
  kakaoButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E0E0',
  },
  kakaoButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E0E0',
  },
  googleButtonText: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LoginScreen;
