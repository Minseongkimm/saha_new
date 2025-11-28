import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import LottieView from 'lottie-react-native';
import { isIPad } from '../../utils/platform';

const IS_IPAD = isIPad();

interface SabaLoaderProps {
  message?: string;
  size?: number;
  containerStyle?: ViewStyle;
  textStyle?: TextStyle;
  animationSource?: object | number;
  loop?: boolean;
}

const DEFAULT_MESSAGE = '도사님이 당신의 기록을 살펴보고 있어요';
const DEFAULT_ANIMATION = require('../../../assets/lottie/loading_lottie.json');

const SabaLoader: React.FC<SabaLoaderProps> = ({
  message = DEFAULT_MESSAGE,
  size = IS_IPAD ? 150 : 90,
  containerStyle,
  textStyle,
  animationSource = DEFAULT_ANIMATION,
  loop = true,
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <LottieView
        source={animationSource}
        autoPlay
        loop={loop}
        style={{ width: size, height: size }}
      />
      {Boolean(message) && (
        <Text style={[styles.message, textStyle]}>
          {message}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    marginTop: IS_IPAD ? 40 : 30,
    fontSize: IS_IPAD ? 24 : 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: IS_IPAD ? 32 : 22,
  },
});

export default SabaLoader;

