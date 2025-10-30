import React, { useEffect, useRef } from 'react';
import { Modal, View, TouchableOpacity, Animated, StyleSheet } from 'react-native';

interface AnimatedBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: number | string;
  minHeight?: number | string;
  contentStyle?: any;
}

const AnimatedBottomSheet: React.FC<AnimatedBottomSheetProps> = ({
  visible,
  onClose,
  children,
  maxHeight = '80%',
  minHeight,
  contentStyle,
}) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }).start();

      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.overlayTouchable} activeOpacity={1} onPress={onClose}>
          <View style={styles.overlayContent} />
        </TouchableOpacity>
        <Animated.View
          style={[
            styles.bottomSheet,
            { transform: [{ translateY: slideAnim }], maxHeight, minHeight },
            contentStyle,
          ]}
        >
          {children}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  overlayContent: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 18,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});

export default AnimatedBottomSheet;


