import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';

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
    paddingHorizontal: 25,
    paddingVertical: 12,
    paddingBottom: 30, // 하단 safe area 고려
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  button: {
    backgroundColor: Colors.primaryColor,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BottomFixedButton;
