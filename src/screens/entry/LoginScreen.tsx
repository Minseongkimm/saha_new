import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import {
  AppleLoginError,
  AppleLoginErrorCode,
  isAppleSignInSupported,
  performAppleLogin,
} from '../../utils/auth/apple_login';
import { KakaoLoginError, performKakaoLogin } from '../../utils/auth/kakao_login';

interface LoginScreenProps {
  navigation: {
    replace: (screenName: string, params?: any) => void;
    navigate: (screenName: string, params?: any) => void;
    reset: (config: { index: number; routes: Array<{ name: string; params?: any }> }) => void;
  };
}

function LoginScreen({ navigation }: LoginScreenProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAppleLogin = async (): Promise<void> => {
    if (!isAppleSignInSupported()) {
      Alert.alert('로그인 불가', '이 기기에서는 Apple 로그인을 지원하지 않습니다.');
      return;
    }
    setIsLoading(true);
    try {
      await performAppleLogin();
    } catch (error) {
      if (error instanceof AppleLoginError) {
        if (error.code === AppleLoginErrorCode.Cancelled) {
          return;
        }
        Alert.alert('로그인 실패', error.message);
        return;
      }
      Alert.alert('로그인 실패', 'Apple 로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigateTerms = (type: 'terms' | 'privacy'): void => {
    navigation.navigate('Terms', { type });
  };

  // 카카오 로그인 (Native SDK 방식)
  const handleKakaoLogin = async (): Promise<void> => {
    setIsLoading(true);

    try {
      await performKakaoLogin();
    } catch (error) {
      if (error instanceof KakaoLoginError) {
        Alert.alert('로그인 실패', error.message);
        return;
      }
      Alert.alert('로그인 실패', '카카오 로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* 상단 이미지 */}
        <View style={styles.imageContainer}>
          <Image 
            source={require('../../../assets/logo/logo_icon.png')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* 중간 텍스트 */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>사바</Text>
          <Text style={styles.description}>
          스스로를 알아가는 길, 사바AI와 함께
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
                source={require('../../../assets/icons/kakao_icon.png')} 
                style={styles.kakaoIcon}
                resizeMode="contain"
              />
              <Text style={styles.kakaoButtonText}>
                {isLoading ? '로그인 중' : '카카오 로그인'}
              </Text>
            </View>
          </TouchableOpacity>
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.loginButton, styles.appleButton]}
              onPress={handleAppleLogin}
              disabled={isLoading}
            >
              <View style={styles.buttonContent}>
                <Icon name="apple" size={20} color="#000000" style={styles.appleIcon} />
                <Text style={styles.appleButtonText}>
                  {isLoading ? '로그인 중' : 'Apple로 로그인'}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* 약관 동의 안내 */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsNoticeText}>
              로그인 시{' '}
              <Text
                onPress={() => handleNavigateTerms('terms')}
                style={styles.termsLink}
              >
                서비스이용약관
              </Text>
              ,{' '}
              <Text
                onPress={() => handleNavigateTerms('privacy')}
                style={styles.termsLink}
              >
                개인정보처리방침
              </Text>
              에 동의합니다.
            </Text>
            <Text style={styles.ageNoticeText}>
              만 14세 이상만 이용 가능합니다.
            </Text>
          </View>
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
    width: 190,
    height: 190,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    color: 'black',
    marginBottom: 8,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'System', // 기본 시스템 폰트
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
    marginBottom: 14,
    borderWidth: 1,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kakaoIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
    borderRadius: 6,
  },
  kakaoButton: {
    backgroundColor: '#FEE500',
    borderColor: '#FEE500',
  },
  kakaoButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  appleButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#BBBBBB',
    borderWidth: 0.2,
  },
  appleButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  appleIcon: {
    marginRight: 8,
  },
  termsContainer: {
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  termsNoticeText: {
    fontSize: 11,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 16,
  },
  ageNoticeText: {
    fontSize: 11,
    color: '#999999',
    textAlign: 'center',
    marginTop: 4,
  },
  termsLink: {
    color: '#666666',
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;