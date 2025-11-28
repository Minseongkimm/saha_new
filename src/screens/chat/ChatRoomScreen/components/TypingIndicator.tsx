/**
 * TypingIndicator - 타이핑 인디케이터 컴포넌트
 * AI가 응답 중일 때 표시되는 애니메이션 점들
 */
import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import { isIPad } from '../../../../utils/platform';

const IS_IPAD = isIPad();

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
      <Animated.View style={[styles.dot, { opacity: dot2Opacity, marginLeft: IS_IPAD ? 10 : 6 }]} />
      <Animated.View style={[styles.dot, { opacity: dot3Opacity, marginLeft: IS_IPAD ? 10 : 6 }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: IS_IPAD ? 10 : 6,
    height: IS_IPAD ? 10 : 6,
    borderRadius: IS_IPAD ? 5 : 3,
    backgroundColor: '#bbb',
  },
});

export default TypingIndicator;
