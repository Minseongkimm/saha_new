import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { login } from '@react-native-seoul/kakao-login';
import { supabase } from '../utils/supabaseClient';

interface LoginScreenProps {
  navigation: {
    replace: (screenName: string, params?: any) => void;
  };
}

function LoginScreen({ navigation }: LoginScreenProps) {
  const [isLoading, setIsLoading] = useState(false);

  // 카카오 로그인 (Native SDK 방식)
  const handleKakaoLogin = async () => {
    setIsLoading(true);

    try {
      // 네이티브 카카오 SDK로 로그인
      const result = await login();
      if (!result.idToken) {
        Alert.alert('로그인 실패', 'ID 토큰을 가져올 수 없습니다.');
        setIsLoading(false);
        return;
      }
      // Supabase Auth에 ID Token으로 로그인
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'kakao',
        token: result.idToken,
      });
      
      if (error) {
        console.error('❌ === Supabase 로그인 에러 ===', error);
        Alert.alert('로그인 실패', `Supabase 로그인에 실패했습니다: ${error.message}`);
        setIsLoading(false);
        return;
      }
      if (data?.user) {
        // 사용자의 birth_infos 데이터 확인
        const { data: birthInfo, error: birthInfoError } = await supabase
          .from('birth_infos')
          .select('*')
          .eq('user_id', data.user.id)
          .single();

        if (birthInfoError && birthInfoError.code !== 'PGRST116') { // PGRST116는 데이터가 없는 경우
          throw birthInfoError;
        }

        // 이미 생년월일 정보가 있으면 MainTabs로, 없으면 BirthInfo 화면으로 이동
        if (birthInfo) {
          navigation.replace('MainTabs');
        } else {
          navigation.replace('BirthInfo', { userId: data.user.id });
        }
      } else {
        console.error('❌ === Supabase 로그인 성공했으나 사용자 데이터 없음 ===');
        Alert.alert('로그인 실패', '사용자 정보를 가져올 수 없습니다.');
      }
      setIsLoading(false);
    } catch (error) {
      console.error('💥 === 카카오 로그인 예외 ===', error);     
      Alert.alert('로그인 실패', '카카오 로그인에 실패했습니다.');
      setIsLoading(false);
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
    color: 'black',
    marginBottom: 8,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'System', // 기본 시스템 폰트
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
    // backgroundColor: '#FFFFFF',
    // borderColor: '#E0E0E0',
    // 카카오 색상
    backgroundColor: '#FEE500',
    borderColor: '#FEE500',
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