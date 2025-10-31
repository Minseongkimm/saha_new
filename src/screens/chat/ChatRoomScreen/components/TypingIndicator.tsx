/**
 * TypingIndicator - 타이핑 인디케이터 컴포넌트
 * AI가 응답 중일 때 표시되는 애니메이션 점들
 */
import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';

const TypingIndicator: React.FC = () => {
  const dot1Opacity = useRef(new Animated.Value(0)).current;
  const dot2Opacity = useRef(new Animated.Value(0)).current;
  const dot3Opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createLoop = (value: Animated.Value, startDelayMs: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration: 300,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
            delay: startDelayMs,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 300,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );

    const a = createLoop(dot1Opacity, 0);
    const b = createLoop(dot2Opacity, 150);
    const c = createLoop(dot3Opacity, 300);
    a.start();
    b.start();
    c.start();
    return () => {
      a.stop();
      b.stop();
      c.stop();
    };
  }, [dot1Opacity, dot2Opacity, dot3Opacity]);

  return (
    <View style={styles.typingRow}>
      <Animated.View style={[styles.dot, { opacity: dot1Opacity }]} />
      <Animated.View style={[styles.dot, { opacity: dot2Opacity, marginLeft: 6 }]} />
      <Animated.View style={[styles.dot, { opacity: dot3Opacity, marginLeft: 6 }]} />
    </View>
  );
};

const styles = {
  typingRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#bbb',
  },
};

export default TypingIndicator;
