import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../../utils/database/supabaseClient';

interface PaymentTransaction {
  id: string;
  amount: number;
  type: 'charge' | 'use';
  description: string;
  created_at: string;
  status: 'success' | 'pending' | 'failed';
}

interface PaymentHistoryBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

const PaymentHistoryBottomSheet: React.FC<PaymentHistoryBottomSheetProps> = ({
  visible,
  onClose,
}) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      fetchTransactions();
      // 애니메이션
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

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // TODO: 실제 거래 내역 조회 로직 구현
      // 예시 데이터
      const mockTransactions: PaymentTransaction[] = [
        {
          id: '1',
          amount: 10,
          type: 'charge',
          description: '사바 충전',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          status: 'success',
        },
        {
          id: '2',
          amount: 30,
          type: 'charge',
          description: '사바 충전',
          created_at: new Date(Date.now() - 172800000).toISOString(),
          status: 'success',
        },
        {
          id: '3',
          amount: 5,
          type: 'use',
          description: '채팅 상담',
          created_at: new Date(Date.now() - 259200000).toISOString(),
          status: 'success',
        },
      ];

      setTransactions(mockTransactions);
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

    if (days === 0) return '오늘';
    if (days === 1) return '어제';
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
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
            <Text style={styles.bottomSheetTitle}>충전 내역</Text>
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
              <Text style={styles.emptyText}>거래 내역이 없습니다</Text>
            </View>
          ) : (
            <FlatList
              data={transactions}
              renderItem={renderTransaction}
              keyExtractor={(item) => item.id}
              style={styles.transactionList}
              showsVerticalScrollIndicator={false}
            />
          )}
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
    maxHeight: '70%',
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    fontSize: 16,
    color: '#999',
  },
  transactionList: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
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

