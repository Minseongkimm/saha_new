import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Image,
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
    { id: 1000, saha_amount: '10', price: '₩1,000' },
    { id: 5000, saha_amount: '50 ', price: '₩5,000' },
    { id: 10000, saha_amount: '100 ', price: '₩10,000' },
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
        duration: 200,
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
            <View style={styles.titleContainer}>
              <Text style={styles.bottomSheetTitle}>사바 충전</Text>
              <Text style={styles.descriptionText}>운명을 이해하고 활용하는 힘</Text>
            </View>
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
                key={option.id}
                style={styles.chargeOption}
                onPress={() => onSelectCharge(option.id)}
              >
                <View style={styles.chargeOptionLeft}>
                  <Image 
                    source={require('../../assets/money/saha_money.png')} 
                    style={styles.sahaMoneyIcon}
                  />
                  <Text style={styles.chargeOptionTitle}>{option.saha_amount}</Text>
                  <Text style={styles.chargeOptionTitle}> 사바</Text>
                </View>
                <View style={styles.priceButton}>
                  <Text style={styles.priceButtonText}>{option.price}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.refundContainer}>
            <Text style={styles.refundText}>
              청약 철회는 구매일로부터 7일 이내 미사용 사바만 가능합니다.
            </Text>
            <View style={styles.refundSecondLine}>
              <TouchableOpacity onPress={() => {}}>
                <Text style={styles.inquiryText}>문의하기</Text>
              </TouchableOpacity>
            </View>
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
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  titleContainer: {
    flex: 1,
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
    marginTop: -5,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    marginTop: 1,
    lineHeight: 20,
  },
  chargeOptions: {
    paddingHorizontal: 10,
    paddingVertical: 17,
  },
  chargeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  chargeOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sahaMoneyIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  chargeOptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  priceButton: {
    backgroundColor: Colors.primaryColor,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  refundContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'flex-start',
  },
  refundText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'left',
    lineHeight: 14,
    marginBottom: 4,
  },
  refundSecondLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inquiryText: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'underline',
    marginLeft: 0,
  },
});

export default ChargeBottomSheet;
