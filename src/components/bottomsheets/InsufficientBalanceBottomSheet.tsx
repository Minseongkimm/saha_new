import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AnimatedBottomSheet from './AnimatedBottomSheet';
import { Colors } from '../../constants/colors';

interface InsufficientBalanceBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onCharge: () => void;
  currentBalance: number;
  freeMessageUsedCount: number;
  freeMessageDailyLimit: number;
}

// 오늘의 한마디 메시지 배열 (사바의 정신을 담은 충전 유도 메시지)
const dailyMessages: string[] = [
  "사바는 당신이 스스로를 이해하도록 돕는 \n길을 비춰주는 작은 등불입니다.",
  "사바가 전하고 싶은 건 단순한 결과가 아니라 \n당신 자신을 이해하는 과정이에요.",
  "사바는 당신이 어떤 사람인지 지금 어떤 흐름 속에 \n있는지를 알려주는 운명의 지도입니다.",
  "사바는 예언하지 않습니다. \n대신 이해하고 활용하는 법을 함께 찾습니다. \n그것이 진짜 운명 사용법입니다.",
  "사바는 인생의 큰 흐름을 봅니다. \n한 번의 대화가 아닌 지속적인 탐색으로 \n더 깊이 알아갈 수 있습니다.",
  "사바와의 대화는 질문과 답의 교환입니다. \n더 질문할수록 더 많은 답이 기다리고 있습니다.",
  "당신의 삶이 조금 더 명확해지는 순간 \n사바는 그곳에 있습니다.",
  "사바는 단순한 결과가 아니라 과정을 중요시합니다. \n함께 찾아가는 여정이 의미 있습니다.",
  "사바와 운명의 지도를 함께 완성해 나가요.",
];

const InsufficientBalanceBottomSheet: React.FC<InsufficientBalanceBottomSheetProps> = ({
  visible,
  onClose,
  onCharge,
  currentBalance,
  freeMessageUsedCount,
  freeMessageDailyLimit,
}) => {
  // visible이 true가 될 때마다 랜덤 메시지 선택
  const selectedMessage = useMemo(() => {
    if (!visible) return null;
    return dailyMessages[Math.floor(Math.random() * dailyMessages.length)];
  }, [visible]);
  return (
    <AnimatedBottomSheet 
      visible={visible} 
      onClose={onClose} 
      contentStyle={styles.bottomSheet}
      maxHeight="40%"
    >
      <View style={styles.container}>
        <View style={styles.bottomSheetHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.bottomSheetTitle}>사바가 모자라요</Text>
            <Text style={styles.descriptionText}>나를 알아가는 여정을 계속하려면</Text>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.contentContainer}>
          {selectedMessage && (
            <View style={styles.messageWrapper}>
              <Text style={styles.quoteMark}>"</Text>
              <Text style={styles.description}>
                {selectedMessage}
              </Text>
              <Text style={styles.quoteMark}>"</Text>
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.chargeButton}
            onPress={onCharge}
          >
            <Text style={styles.chargeButtonText}>충전하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AnimatedBottomSheet>
  );
};

const styles = StyleSheet.create({
  bottomSheet: {
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  container: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 40,
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
  descriptionText: {
    fontSize: 14,
    color: '#666',
    marginTop: 1,
    lineHeight: 20,
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
  contentContainer: {
    paddingHorizontal: 11,
    paddingTop: 28,
    paddingBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  messageWrapper: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  quoteMark: {
    fontSize: 48,
    color: Colors.primaryColor,
    lineHeight: 40,
    fontWeight: '300',
    opacity: 0.8,
    marginTop: -6,
  },
  description: {
    flex: 1,
    fontSize: 15,
    color: '#555555',
    lineHeight: 24,
    textAlign: 'center',
    fontWeight: '400',
    letterSpacing: 0.2,
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  buttonContainer: {
    paddingHorizontal: 18,
    paddingTop: 20,
    width: '100%',
  },
  chargeButton: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primaryColor,
  },
  chargeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default InsufficientBalanceBottomSheet;

