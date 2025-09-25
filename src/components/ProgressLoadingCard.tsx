import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
} from 'react-native';
import { Colors } from '../constants/colors';

interface ProgressLoadingCardProps {
  title?: string;
  description?: string;
  duration?: number; // 애니메이션 지속 시간 (ms)
  iconSource?: any; // 아이콘 이미지 소스
  showProgress?: boolean; // 프로그레스 바 표시 여부
  showIcon?: boolean; // 아이콘 표시 여부
  style?: any;
}

const ProgressLoadingCard: React.FC<ProgressLoadingCardProps> = ({
  title = '로딩 중...',
  description,
  duration = 15000, // 기본 15초
  iconSource = require('../../assets/logo/logo_icon.png'),
  showProgress = true,
  showIcon = true,
  style,
}) => {
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const iconScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 프로그레스 애니메이션 시작
    if (showProgress) {
      const startTime = Date.now();
      
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const timeBasedProgress = Math.min((elapsed / duration) * 90, 90); // 90%까지 시간 기반
        
        setProgress(prev => {
          // 시간 기반 진행률과 이전 값 중 더 큰 값 사용 (뒤로 가지 않도록)
          return Math.max(timeBasedProgress, prev);
        });
      }, 100); // 100ms마다 업데이트로 부드러운 진행
    }

    // 아이콘 애니메이션 시작
    if (showIcon) {
      const iconAnimation = () => {
        Animated.sequence([
          Animated.timing(iconScale, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(iconScale, {
            toValue: 1.0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (showIcon) {
            iconAnimation();
          }
        });
      };
      iconAnimation();
    }

    // 컴포넌트 언마운트 시 정리
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [duration, showProgress, showIcon, iconScale]);

  const completeProgress = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setProgress(100);
  };

  // 외부에서 프로그레스 완료를 호출할 수 있도록 expose (필요시 사용)
  // React.useImperativeHandle(React.forwardRef(() => null), () => ({
  //   completeProgress,
  // }));

  return (
    <View style={[styles.container, style]} testID="progress-loading-card">
      {showIcon && (
        <Animated.Image 
          source={iconSource} 
          style={[
            styles.loadingIcon,
            { transform: [{ scale: iconScale }] }
          ]}
          testID="loading-icon"
        />
      )}
      
      <Text style={styles.title} testID="loading-title">
        {title}
        {description && (
          <>
            {'\n'}
            <Text style={styles.description} testID="loading-description">
              {description}
            </Text>
          </>
        )}
      </Text>
      
      {showProgress && (
        <View style={styles.progressContainer} testID="progress-container">
          <Text style={styles.progressText} testID="progress-text">
            {Math.round(progress)}%
          </Text>
          <View style={styles.progressBar} testID="progress-bar">
            <View 
              style={[
                styles.progressFill, 
                { width: `${progress}%` }
              ]} 
              testID="progress-fill"
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 25,
    paddingHorizontal: 20,
    backgroundColor: '#fefefe',
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: '#f5f5f5',
  },
  loadingIcon: {
    width: 65,
    height: 65,
    marginBottom: 12,
    marginTop: 10,
  },
  title: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  description: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  progressContainer: {
    marginTop: 15,
    alignItems: 'center',
    width: '100%',
  },
  progressText: {
    fontSize: 14,
    color: Colors.primaryColor,
    marginBottom: 8,
    fontWeight: '600',
  },
  progressBar: {
    width: '80%',
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primaryColor,
    borderRadius: 4,
  },
});

export default ProgressLoadingCard;
