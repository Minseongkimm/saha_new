import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Image,
  Pressable,
  GestureResponderEvent,
} from 'react-native';
import { login } from '@react-native-seoul/kakao-login';
import { supabase } from '../../utils/database/supabaseClient';

interface LoginScreenProps {
  navigation: {
    replace: (screenName: string, params?: any) => void;
    navigate: (screenName: string, params?: any) => void;
  };
}

function LoginScreen({ navigation }: LoginScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const toggleTermsAgreement = (): void => {
    setAgreedToTerms(prev => !prev);
  };

  const handleNavigateTerms = (type: 'terms' | 'privacy'): void => {
    navigation.navigate('Terms', { type });
  };

  // 카카오 로그인 (Native SDK 방식)
  const handleKakaoLogin = async () => {
    if (!agreedToTerms) {
      Alert.alert('약관 동의 필요', '서비스 이용을 위해 이용약관 및 개인정보처리방침에 동의해주세요.');
      return;
    }
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
        // 약관 동의 정보를 user_metadata에 저장
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            ...data.user.user_metadata,
            agreed_to_terms: true,
            terms_agreed_at: new Date().toISOString(),
          },
        });

        if (updateError) {
          console.error('약관 동의 정보 저장 오류:', updateError);
          // 계속 진행 (약관 동의는 필수이지만 저장 실패해도 로그인은 진행)
        }

        // 사용자의 birth_infos 데이터 확인
        const { data: birthInfo, error: birthInfoError } = await supabase
          .from('birth_infos')
          .select('*')
          .eq('user_id', data.user.id)
          .single();

        if (birthInfoError && birthInfoError.code !== 'PGRST116') { // PGRST116는 데이터가 없는 경우
          throw birthInfoError;
        }

        // 세션 상태 업데이트를 위해 세션 확인 후 네비게이션
        const checkSessionAndNavigate = async () => {
          let retries = 0;
          const maxRetries = 10;
          
          while (retries < maxRetries) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              try {
                // 이미 생년월일 정보가 있으면 MainTabs로, 없으면 BirthInfo 화면으로 이동
                if (birthInfo) {
                  navigation.replace('MainTabs');
                } else {
                  navigation.replace('BirthInfo', { userId: data.user.id });
                }
                return;
              } catch (error) {
                console.error('네비게이션 에러:', error);
                // App.tsx의 세션 상태 변경으로 자동 네비게이션될 때까지 대기
                return;
              }
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
          }
        };
        
        checkSessionAndNavigate();
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

          {/* 약관 동의 */}
          <View style={styles.termsContainer}>
            <Pressable style={styles.checkboxTapArea} onPress={toggleTermsAgreement}>
              <View style={styles.checkboxContainer}>
                <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                  {agreedToTerms && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <View style={styles.termsTextWrapper}>
                  <Text style={styles.termsText}>
                    <Text
                      onPress={(event: GestureResponderEvent) => {
                        event.stopPropagation();
                        handleNavigateTerms('terms');
                      }}
                      style={styles.termsLink}
                    >
                      이용약관
                    </Text>
                    {' 및 '}
                    <Text
                      onPress={(event: GestureResponderEvent) => {
                        event.stopPropagation();
                        handleNavigateTerms('privacy');
                      }}
                      style={styles.termsLink}
                    >
                      개인정보처리방침
                    </Text>
                    에 동의합니다
                  </Text>
                </View>
              </View>
            </Pressable>
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
  termsContainer: {
    alignItems: 'center',
  },
  checkboxTapArea: {
    paddingVertical: 3,
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '90%',
    justifyContent: 'center',
  },
  termsTextWrapper: {
    flexShrink: 1,
    justifyContent: 'center',
  },
  checkbox: {
    width: 17,
    height: 17,
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#FEE500',
    borderColor: '#FEE500',
  },
  checkmark: {
    color: '#000000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  termsText: {
    fontSize: 13,
    color: '#666666',
    flex: 0,
    flexShrink: 1,
    flexWrap: 'wrap',
    textAlign: 'left',
  },
  termsLink: {
    color: '#666666',
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;