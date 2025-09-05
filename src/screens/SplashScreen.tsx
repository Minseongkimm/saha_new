import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../constants/colors';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    // 초기 api 나중에 추가 해야함, 로그인 토큰 있는지 확인 -> 없으면 로그인화면, 있으면 홈화면

    // 애니메이션 시작
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // 애니메이션 완료 후 스피너 표시
      setTimeout(() => {
        setShowSpinner(true);
        // 1초 후 자동으로 메인 화면으로 이동
        setTimeout(() => {
          onFinish();
        }, 1000);
      }, 300);
    });
  }, []);



  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        <Image
          source={require('../../assets/logo/logo_icon.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </Animated.View>

      {showSpinner && (
        <Animated.View
          style={[
            styles.spinnerContainer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <ActivityIndicator size="large" color={Colors.primaryColor} />
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 90,
  },
  logoImage: {
    width: 200,
    height: 200,
  },
  spinnerContainer: {
    position: 'absolute',
    bottom: 150,
    alignItems: 'center',
  },
});

export default SplashScreen;
