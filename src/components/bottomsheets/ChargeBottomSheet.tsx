import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import AnimatedBottomSheet from './AnimatedBottomSheet';
import { Colors } from '../../constants/colors';

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
  // Animation handled by AnimatedBottomSheet

  const chargeOptions = [
    { id: 1000, saha_amount: '10', price: '₩1,000', service_amount: '2', chip: null },
    { id: 3000, saha_amount: '30', price: '₩3,000', service_amount: '5', chip: 'hot' },
    { id: 5000, saha_amount: '50', price: '₩5,000', service_amount: '10', chip: null },
    { id: 10000, saha_amount: '100', price: '₩10,000', service_amount: '15', chip: 'best' },
  ];

  // no-op

  return (
    <AnimatedBottomSheet visible={visible} onClose={onClose} contentStyle={styles.bottomSheet}>
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
                    source={require('../../../assets/money/saha_money.png')} 
                    style={styles.sahaMoneyIcon}
                  />
                  <Text style={styles.chargeOptionTitle}>{option.saha_amount}</Text>
                  <Text style={styles.chargeOptionTitle}>사바</Text>
                  {option.service_amount !== '0' && (
                    <Text style={styles.serviceAmountText}>+ {option.service_amount} 사바</Text>
                  )}
                  {option.chip && (
                    <View style={[styles.chip, option.chip === 'hot' ? styles.hotChip : styles.bestChip]}>
                      <Text style={[styles.chipText, option.chip === 'hot' ? styles.hotChipText : styles.bestChipText]}>
                        {option.chip === 'hot' ? 'HOT' : 'BEST'}
                      </Text>
                    </View>
                  )}
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
    </AnimatedBottomSheet>
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
    fontSize: 17,
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
    paddingHorizontal: 11,
    paddingTop: 9,
    paddingBottom: 17,
  },
  chargeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
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
    marginRight: 2,
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  serviceAmountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ff6b6b',
    marginLeft: 4,
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
  chip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  hotChip: {
    backgroundColor: '#FF4444',
  },
  bestChip: {
    backgroundColor: '#FF4444',
  },
  chipText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
  },
  hotChipText: {
    color: 'white',
  },
  bestChipText: {
    color: 'white',
  },
});

export default ChargeBottomSheet;
