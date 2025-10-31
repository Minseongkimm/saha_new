import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  SafeAreaView,
  Image,
} from 'react-native';
import { Colors } from '../../constants/colors';

interface LoadingScreenProps {
  onComplete?: () => void;
  message?: string;
}

interface LoadingStep {
  id: string;
  title: string;
  description: string;
  duration: number; // ms
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  onComplete,
  message = '이 과정은 가입시 최초 1번만 진행됩니다. 약 20초 소요됩니다'
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // 통일된 로딩 설정
  const config = {
    title: 'AI 분석 중',
    estimatedTime: 30,
    steps: [
      {
        id: 'analyze',
        title: '데이터 분석',
        description: '사주 정보를 분석하는 중',
        duration: 5000
      },
      {
        id: 'calculate',
        title: '운세 계산',
        description: '오행의 조화를 계산하는 중',
        duration: 5000
      },
      {
        id: 'generate',
        title: 'AI 해석 생성',
        description: '자연어로 해석을 생성하는 중',
        duration: 15000
      },
      {
        id: 'finalize',
        title: '최종 검토',
        description: '결과를 정리하는 중',
        duration: 5000
      }
    ]
  };
  const [remainingTime, setRemainingTime] = useState(config.estimatedTime);

  // 로딩 팁들
  const loadingTips = [
    "사주는 하늘의 시간과 땅의 공간이 만나는 지점입니다",
    "오늘은 어떤 하루가 될까요?",
    "운명은 준비된 자에게 기회를 줍니다",
    "천간지지의 조화를 분석하고 있습니다",
    "새해에는 새로운 시작이 기다립니다"
  ];
  const [currentTip, setCurrentTip] = useState(0);


  // 애니메이션 시작
  useEffect(() => {
    setCurrentStep(0);
    setProgress(0);
    setIsCompleted(false);
    setRemainingTime(config.estimatedTime);

    // 페이드인 애니메이션
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    startLoadingProcess();
  }, []);

  // 로딩 프로세스 시작
  const startLoadingProcess = () => {
    let stepIndex = 0;

    const processStep = () => {
      if (stepIndex >= config.steps.length) {
        setIsCompleted(true);
        setTimeout(() => {
          onComplete?.();
        }, 1000);
        return;
      }

      const step = config.steps[stepIndex];
      setCurrentStep(stepIndex);

      // 단계별 진행률 계산
      const stepProgress = (stepIndex + 1) / config.steps.length * 100;
      setProgress(stepProgress);
      
      // 프로그레스 애니메이션
      Animated.timing(progressAnim, {
        toValue: stepProgress,
        duration: step.duration,
        useNativeDriver: false,
      }).start();

      // 남은 시간 업데이트
      const timeInterval = setInterval(() => {
        setRemainingTime(prev => Math.max(0, prev - 1));
      }, 1000);

      setTimeout(() => {
        clearInterval(timeInterval);
        stepIndex++;
        processStep();
      }, step.duration);
    };

    processStep();
  };

  // 팁 로테이션
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % loadingTips.length);
    }, 4000);
    return () => clearInterval(tipInterval);
  }, []);


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View 
          style={[
            styles.loadingContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.title}>{config.title}</Text>
          </View>

          {/* 단계별 목록 */}
          <View style={styles.stepsListContainer}>
            {config.steps.map((step, index) => (
              <View key={step.id} style={styles.stepRow}>
                <View style={styles.stepNumberContainer}>
                  <View 
                    style={[
                      styles.stepNumber,
                      index <= currentStep && styles.stepNumberActive
                    ]}
                  >
                    <Text style={[
                      styles.stepNumberText,
                      index <= currentStep && styles.stepNumberTextActive
                    ]}>
                      {index + 1}
                    </Text>
                  </View>
                  {index < config.steps.length - 1 && (
                    <View 
                      style={[
                        styles.stepLine,
                        index < currentStep && styles.stepLineActive
                      ]} 
                    />
                  )}
                </View>
                <View style={styles.stepTextContainer}>
                  <Text style={[
                    styles.stepRowTitle,
                    index <= currentStep && styles.stepRowTitleActive
                  ]}>
                    {step.title}
                  </Text>
                  <Text style={[
                    styles.stepRowDescription,
                    index <= currentStep && styles.stepRowDescriptionActive
                  ]}>
                    {step.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* 로딩 팁 */}
          {/* <View style={styles.tipContainer}>
            <Text style={styles.tipText}>
              💡 {loadingTips[currentTip]}
            </Text>
          </View> */}
        </Animated.View>

        {/* 하단 프로그레스 바 */}
        <View style={styles.bottomProgressContainer}>
          <Text style={styles.bottomMessage}>{message}</Text>
          <View style={styles.bottomProgressBar}>
            <Animated.View 
              style={[
                styles.bottomProgressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                    extrapolate: 'clamp',
                  })
                }
              ]}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  loadingContainer: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  stepsListContainer: {
    width: '100%',
    marginBottom: 40,
    alignItems: 'center',
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 20,
    maxWidth: 350,
  },
  stepNumberContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberActive: {
    backgroundColor: Colors.primaryColor,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#999',
  },
  stepNumberTextActive: {
    color: 'white',
  },
  stepLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e0e0e0',
    marginTop: 8,
    minHeight: 8,
  },
  stepLineActive: {
    backgroundColor: Colors.primaryColor,
  },
  stepTextContainer: {
    flex: 1,
    paddingTop: 4,
  },
  stepRowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginBottom: 4,
  },
  stepRowTitleActive: {
    color: '#333',
  },
  stepRowDescription: {
    fontSize: 13,
    color: '#ccc',
    lineHeight: 18,
  },
  stepRowDescriptionActive: {
    color: '#666',
  },
  tipContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    width: '100%',
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  completedContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#e8f5e8',
    borderRadius: 12,
    width: '100%',
  },
  completedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2e7d32',
    textAlign: 'center',
  },
  bottomProgressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  bottomMessage: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
  },
  bottomProgressBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  bottomProgressFill: {
    height: '100%',
    backgroundColor: Colors.primaryColor,
    borderRadius: 3,
  },
});

export default LoadingScreen;
