import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import AnimatedBottomSheet from './AnimatedBottomSheet';
import { fetchPaymentTransactions } from '../../utils/payments/transactions';
import { PaymentTransaction } from '../../utils/payments/types';

interface PaymentHistoryBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

const PaymentHistoryBottomSheet: React.FC<PaymentHistoryBottomSheetProps> = ({
  visible,
  onClose,
}) => {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      fetchTransactions();
    }
  }, [visible]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await fetchPaymentTransactions();
      setTransactions(data);
    } catch (error) {
      console.error('거래 내역 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    const month = date.getMonth() + 1;
    const day = date.getDate();

    if (days === 0) return `오늘 - ${month}월 ${day}일`;
    if (days === 1) return `어제 - ${month}월 ${day}일`;
    if (days < 7) return `${days}일 전 - ${month}월 ${day}일`;
    
    // 7일 이상이면 날짜만 표시
    return `${month}월 ${day}일`;
  };

  const renderTransaction = ({ item }: { item: PaymentTransaction }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionLeft}>
        <Text style={styles.transactionDescription}>{item.description}</Text>
        <Text style={styles.transactionDate}>{formatDate(item.created_at)}</Text>
      </View>
      <View style={styles.transactionRight}>
        <Text style={[
          styles.transactionAmount,
          item.type === 'charge' ? styles.chargeAmount : styles.useAmount
        ]}>
          {item.type === 'charge' ? '+' : '-'}{item.amount}
        </Text>
      </View>
    </View>
  );

  return (
    <AnimatedBottomSheet visible={visible} onClose={onClose} maxHeight={'80%'} minHeight={'40%'} contentStyle={styles.bottomSheet}>
          <View style={styles.bottomSheetHeader}>
            <View style={styles.titleContainer}>
              <Text style={styles.bottomSheetTitle}>충전 내역</Text>
              <Text style={styles.descriptionText}>운명을 더 이해하려는 당신의 노력</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : transactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>내역이 없습니다</Text>
            </View>
          ) : (
            <FlatList
              data={transactions}
              renderItem={renderTransaction}
              keyExtractor={(item) => item.id}
              style={styles.transactionList}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            />
          )}
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
    minHeight: '40%',
    maxHeight: '80%',
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 14,
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
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    lineHeight: 22,
    fontSize: 16,
    color: '#999',
  },
  transactionList: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionLeft: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 13,
    color: '#999',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  chargeAmount: {
    color: '#007AFF',
  },
  useAmount: {
    color: '#ff4757',
  },
});

export default PaymentHistoryBottomSheet;

