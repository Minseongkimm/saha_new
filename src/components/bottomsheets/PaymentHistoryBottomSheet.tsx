import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import AnimatedBottomSheet from './AnimatedBottomSheet';
import { fetchChargeTransactions, fetchUsageTransactions } from '../../utils/payments/transactions';
import { PaymentTransaction } from '../../utils/payments/types';
import { Colors } from '../../constants/colors';
import { formatPaymentDate } from '../../utils/text/dateFormat';
import SabaLoader from '../../components/common/SabaLoader';
import { isIPad } from '../../utils/platform';

const IS_IPAD = isIPad();

interface PaymentHistoryBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

type TabType = 'charge' | 'use';

const PaymentHistoryBottomSheet: React.FC<PaymentHistoryBottomSheetProps> = ({
  visible,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('charge');
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      fetchTransactions();
    }
  }, [visible, activeTab]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = activeTab === 'charge' 
        ? await fetchChargeTransactions() 
        : await fetchUsageTransactions();
      setTransactions(data);
    } catch (error) {
      console.error('거래 내역 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };


  const renderTransaction = ({ item }: { item: PaymentTransaction }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionLeft}>
        <Text style={styles.transactionDescription}>{item.description}</Text>
        <Text style={styles.transactionDate}>{formatPaymentDate(item.created_at)}</Text>
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
              <Text style={styles.bottomSheetTitle}>사용 내역</Text>
              <Text style={styles.descriptionText}>운명을 더 이해하려는 당신의 노력</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* 탭 버튼 */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'charge' && styles.activeTab]}
              onPress={() => setActiveTab('charge')}
            >
              <Text style={[styles.tabText, activeTab === 'charge' && styles.activeTabText]}>
                충전 내역
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'use' && styles.activeTab]}
              onPress={() => setActiveTab('use')}
            >
              <Text style={[styles.tabText, activeTab === 'use' && styles.activeTabText]}>
                사용 내역
              </Text>
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={styles.loadingWrapper}>
              <SabaLoader size={64} message="" />
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
    minHeight: '45%',
    maxHeight: '80%',
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: IS_IPAD ? 30 : 20,
    paddingTop: IS_IPAD ? 28 : 20,
    paddingBottom: IS_IPAD ? 20 : 14,
  },
  titleContainer: {
    flex: 1,
  },
  bottomSheetTitle: {
    fontSize: IS_IPAD ? 24 : 17,
    fontWeight: '600',
    color: '#333',
  },
  descriptionText: {
    fontSize: IS_IPAD ? 18 : 14,
    color: '#666',
    marginTop: IS_IPAD ? 4 : 0,
    lineHeight: IS_IPAD ? 28 : 20,
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
  loadingContainer: {
    padding: IS_IPAD ? 60 : 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: IS_IPAD ? 60 : 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    lineHeight: IS_IPAD ? 32 : 22,
    fontSize: IS_IPAD ? 20 : 16,
    color: '#999',
  },
  transactionList: {
    paddingHorizontal: IS_IPAD ? 30 : 20,
    paddingTop: IS_IPAD ? 6 : 3,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: IS_IPAD ? 16 : 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionLeft: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: IS_IPAD ? 20 : 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: IS_IPAD ? 6 : 4,
  },
  transactionDate: {
    fontSize: IS_IPAD ? 16 : 13,
    color: '#999',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: IS_IPAD ? 20 : 16,
    fontWeight: '600',
  },
  chargeAmount: {
    color: Colors.primaryColor,
  },
  useAmount: {
    color: Colors.debitColor,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: IS_IPAD ? 30 : 16,
    paddingVertical: IS_IPAD ? 6 : 3,
    gap: IS_IPAD ? 14 : 10,
  },
  tab: {
    flex: 1,
    paddingVertical: IS_IPAD ? 18 : 10,
    alignItems: 'center',
    borderRadius: IS_IPAD ? 12 : 8,
    backgroundColor: '#f5f5f5',
  },
  activeTab: {
    backgroundColor: Colors.primaryColor,
  },
  tabText: {
    fontSize: IS_IPAD ? 18 : 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
  },
  loadingWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: IS_IPAD ? 60 : 40,
  },
});

export default PaymentHistoryBottomSheet;

