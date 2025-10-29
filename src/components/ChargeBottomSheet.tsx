import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { Colors } from '../constants/colors';

interface ChargeBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectCharge: (amount: number) => void;
}

const ChargeBottomSheet: React.FC<ChargeBottomSheetProps> = ({
  visible,
  onClose,
  onSelectCharge,
}) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const chargeOptions = [
    { amount: 1000, title: '1,000 상평통보', price: '₩1,000' },
    { amount: 5000, title: '5,000 상평통보', price: '₩5,000' },
    { amount: 10000, title: '10,000 상평통보', price: '₩10,000' },
  ];

  useEffect(() => {
    if (visible) {
      // 배경 페이드 인
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      // 바텀시트 슬라이드 업
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // 바텀시트 슬라이드 다운
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }).start();
      
      // 배경 페이드 아웃
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <TouchableOpacity 
          style={styles.overlayTouchable} 
          activeOpacity={1} 
          onPress={onClose}
        >
          <View style={styles.overlayContent} />
        </TouchableOpacity>
        <Animated.View 
          style={[styles.bottomSheet, { transform: [{ translateY: slideAnim }] }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.bottomSheetHeader}>
            <Text style={styles.bottomSheetTitle}>상평통보 충전</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.chargeOptions}>
            {chargeOptions.map((option) => (
              <TouchableOpacity
                key={option.amount}
                style={styles.chargeOption}
                onPress={() => onSelectCharge(option.amount)}
              >
                <Text style={styles.chargeOptionTitle}>{option.title}</Text>
                <Text style={styles.chargeOptionPrice}>{option.price}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
    paddingBottom: 34, // iPhone 하단 홈 인디케이터 고려
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  chargeOptions: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  chargeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 10,
  },
  chargeOptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  chargeOptionPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primaryColor,
  },
});

export default ChargeBottomSheet;
