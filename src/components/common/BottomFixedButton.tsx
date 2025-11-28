import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';
import { isIPad } from '../../utils/platform';

const IS_IPAD = isIPad();

interface BottomFixedButtonProps {
  onPress: () => void;
  text: string;
  style?: any;
  buttonStyle?: any;
  textStyle?: any;
}

const BottomFixedButton: React.FC<BottomFixedButtonProps> = ({
  onPress,
  text,
  style,
  buttonStyle,
  textStyle,
}) => {
  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity 
        style={[styles.button, buttonStyle]}
        onPress={onPress}
      >
        <Text style={[styles.buttonText, textStyle]}>{text}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    paddingHorizontal: IS_IPAD ? 40 : 25,
    paddingVertical: IS_IPAD ? 20 : 12,
    paddingBottom: IS_IPAD ? 40 : 30, // 하단 safe area 고려
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  button: {
    backgroundColor: Colors.primaryColor,
    borderRadius: IS_IPAD ? 16 : 12,
    paddingVertical: IS_IPAD ? 20 : 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: IS_IPAD ? 22 : 16,
    fontWeight: '600',
  },
});

export default BottomFixedButton;
