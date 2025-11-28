import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import AnimatedBottomSheet from './AnimatedBottomSheet';
import { Colors } from '../../constants/colors';
import { CHARGE_OPTIONS } from '../../constants/payments';
import { isIPad } from '../../utils/platform';

const IS_IPAD = isIPad();

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

  const chargeOptions = CHARGE_OPTIONS.map((option) => ({
    id: option.id,
    saha_amount: option.sahaAmount.toString(),
    price: `₩${option.priceMinor.toLocaleString()}`,
    service_amount: option.bonusSaha.toString(),
    chip: option.chip,
  }));

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
    paddingHorizontal: IS_IPAD ? 26 : 20,
    paddingVertical: IS_IPAD ? 22 : 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  titleContainer: {
    flex: 1,
  },
  bottomSheetTitle: {
    fontSize: IS_IPAD ? 24 : 17,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    width: IS_IPAD ? 38 : 30,
    height: IS_IPAD ? 38 : 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: IS_IPAD ? -8 : -5,
  },
  closeButtonText: {
    fontSize: IS_IPAD ? 22 : 16,
    color: '#666',
  },
  descriptionText: {
    fontSize: IS_IPAD ? 18 : 14,
    color: '#666',
    marginTop: IS_IPAD ? 4 : 1,
    lineHeight: IS_IPAD ? 28 : 20,
  },
  chargeOptions: {
    paddingHorizontal: IS_IPAD ? 18 : 11,
    paddingTop: IS_IPAD ? 14 : 9,
    paddingBottom: IS_IPAD ? 20 : 17,
  },
  chargeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: IS_IPAD ? 16 : 11,
    paddingHorizontal: IS_IPAD ? 22 : 15,
  },
  chargeOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sahaMoneyIcon: {
    width: IS_IPAD ? 36 : 20,
    height: IS_IPAD ? 36 : 20,
    marginRight: IS_IPAD ? 14 : 8,
  },
  chargeOptionTitle: {
    marginRight: IS_IPAD ? 4 : 2,
    fontSize: IS_IPAD ? 24 : 16,
    fontWeight: '700',
    color: '#333',
  },
  serviceAmountText: {
    fontSize: IS_IPAD ? 18 : 12,
    fontWeight: '600',
    color: Colors.debitColor,
    marginLeft: IS_IPAD ? 8 : 4,
  },
  priceButton: {
    backgroundColor: Colors.primaryColor,
    paddingVertical: IS_IPAD ? 12 : 8,
    paddingHorizontal: IS_IPAD ? 20 : 16,
    borderRadius: IS_IPAD ? 10 : 6,
    minWidth: IS_IPAD ? 140 : 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceButtonText: {
    fontSize: IS_IPAD ? 18 : 14,
    fontWeight: 'bold',
    color: 'white',
  },
  refundContainer: {
    paddingHorizontal: IS_IPAD ? 26 : 20,
    paddingBottom: IS_IPAD ? 24 : 20,
    alignItems: 'flex-start',
  },
  refundText: {
    fontSize: IS_IPAD ? 16 : 12,
    color: '#999',
    textAlign: 'left',
    lineHeight: IS_IPAD ? 24 : 14,
    marginBottom: IS_IPAD ? 6 : 4,
    marginLeft: IS_IPAD ? 16 : 5,
  },
  refundSecondLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inquiryText: {
    fontSize: IS_IPAD ? 16 : 12,
    color: '#999',
    textDecorationLine: 'underline',
    marginLeft: 0,
  },
  chip: {
    paddingHorizontal: IS_IPAD ? 10 : 6,
    paddingVertical: IS_IPAD ? 4 : 2,
    borderRadius: IS_IPAD ? 6 : 4,
    marginLeft: IS_IPAD ? 10 : 6,
  },
  hotChip: {
    backgroundColor: Colors.debitColor,
  },
  bestChip: {
    backgroundColor: Colors.debitColor,
  },
  chipText: {
    fontSize: IS_IPAD ? 14 : 10,
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
