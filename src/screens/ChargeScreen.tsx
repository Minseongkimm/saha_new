import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { Colors } from '../constants/colors';

interface ChargeScreenProps {
  navigation: any;
}

const ChargeScreen: React.FC<ChargeScreenProps> = ({ navigation }) => {
  const [selectedAmount, setSelectedAmount] = useState<string>('');
  const [customAmount, setCustomAmount] = useState<string>('');

  const chargeAmounts = [
    { amount: '1000', price: '1,000원', bonus: '' },
    { amount: '5000', price: '5,000원', bonus: '' },
    { amount: '10000', price: '10,000원', bonus: '1,000원' },
    { amount: '30000', price: '30,000원', bonus: '3,000원' },
    { amount: '50000', price: '50,000원', bonus: '5,000원' },
    { amount: '100000', price: '100,000원', bonus: '10,000원' },
  ];

  const handleAmountSelect = (amount: string) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (text: string) => {
    setCustomAmount(text);
    setSelectedAmount('');
  };

  const handleCharge = () => {
    const finalAmount = selectedAmount || customAmount;
    if (!finalAmount || parseInt(finalAmount) < 1000) {
      Alert.alert('알림', '최소 충전 금액은 1,000원입니다.');
      return;
    }
    
    Alert.alert(
      '충전 확인',
      `${parseInt(finalAmount).toLocaleString()}원을 충전하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        { text: '충전', onPress: () => {
          Alert.alert('충전 완료', '상평통보가 충전되었습니다.');
          navigation.goBack();
        }}
      ]
    );
  };

  const getBonusText = (bonus: string) => {
    if (!bonus) return null;
    return <Text style={styles.bonusText}>+{bonus}</Text>;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>상평통보 충전</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.balanceCard}>
          <Image 
            source={require('../../assets/money/sangpyeong.jpg')} 
            style={styles.coinIcon}
          />
          <Text style={styles.balanceTitle}>현재 잔액</Text>
          <Text style={styles.balanceAmount}>1,250</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>충전 금액 선택</Text>
          
          <View style={styles.amountGrid}>
            {chargeAmounts.map((item) => (
              <TouchableOpacity
                key={item.amount}
                style={[
                  styles.amountButton,
                  selectedAmount === item.amount && styles.amountButtonSelected
                ]}
                onPress={() => handleAmountSelect(item.amount)}
              >
                <Text style={[
                  styles.amountText,
                  selectedAmount === item.amount && styles.amountTextSelected
                ]}>
                  {parseInt(item.amount).toLocaleString()}
                </Text>
                <Text style={[
                  styles.priceText,
                  selectedAmount === item.amount && styles.priceTextSelected
                ]}>
                  {item.price}
                </Text>
                {getBonusText(item.bonus)}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.chargeButtonContainer}>
          <TouchableOpacity 
            style={[
              styles.chargeButton,
              (!selectedAmount && !customAmount) && styles.chargeButtonDisabled
            ]}
            onPress={handleCharge}
            disabled={!selectedAmount && !customAmount}
          >
            <Text style={styles.chargeButtonText}>
              {selectedAmount || customAmount 
                ? `${parseInt(selectedAmount || customAmount).toLocaleString()}원 충전하기`
                : '충전할 금액을 선택하세요'
              }
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: Colors.primaryColor,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerRight: {
    width: 40,
  },
  balanceCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 15,
    alignItems: 'center',    
  },
  coinIcon: {
    width: 85,
    height: 85,
    borderRadius: 24,
    marginBottom: 16,
  },
  balanceTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    marginBottom: 0,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingVertical: 20,
    paddingTop: 20,
    borderBottomColor: 'transparent',
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 14,
  },
  amountButton: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  amountButtonSelected: {
    backgroundColor: Colors.primaryColor,
    borderColor: Colors.primaryColor,
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  amountTextSelected: {
    color: 'white',
  },
  priceText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  priceTextSelected: {
    color: 'white',
    opacity: 0.9,
  },
  bonusText: {
    fontSize: 12,
    color: '#ff6b6b',
    fontWeight: '600',
  },
  customAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  customAmountInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
  },
  currencyText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  customAmountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  customAmountLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  customAmountValue: {
    fontSize: 16,
    color: Colors.primaryColor,
    fontWeight: '600',
  },
  chargeButtonContainer: {
    paddingHorizontal: 20,
    marginTop: 25,
    marginBottom: 20,
  },
  chargeButton: {
    backgroundColor: Colors.primaryColor,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  chargeButtonDisabled: {
    backgroundColor: '#ccc',
  },
  chargeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: 'white',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default ChargeScreen;
