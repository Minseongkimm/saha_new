import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  AppState,
  AppStateStatus,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../utils/database/supabaseClient';
import { openStoreForReview, REVIEW_REWARD_SAHA } from '../../constants/review_reward';
import {
  hasUserReceivedReviewReward,
  grantReviewReward,
} from '../../utils/reviewReward/reviewReward';
import ConfirmModal from '../../components/common/ConfirmModal';
import { Colors } from '../../constants/colors';

const StoreScreen: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [hasReceivedReward, setHasReceivedReward] = useState<boolean>(false);
  const [isCheckingReward, setIsCheckingReward] = useState<boolean>(true);
  const [showReviewConfirmModal, setShowReviewConfirmModal] = useState<boolean>(false);
  const [pendingReviewConfirm, setPendingReviewConfirm] = useState<boolean>(false);
  const [isGranting, setIsGranting] = useState<boolean>(false);
  const [rewardCardDismissed, setRewardCardDismissed] = useState<boolean>(false);

  const loadUserAndRewardStatus = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    if (!user?.id) {
      setIsCheckingReward(false);
      return;
    }
    try {
      const received = await hasUserReceivedReviewReward(user.id);
      setHasReceivedReward(received);
    } catch (e) {
      console.error('loadUserAndRewardStatus error:', e);
    } finally {
      setIsCheckingReward(false);
    }
  }, []);

  useEffect(() => {
    loadUserAndRewardStatus();
  }, [loadUserAndRewardStatus]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active' && pendingReviewConfirm) {
          setShowReviewConfirmModal(true);
          setPendingReviewConfirm(false);
        }
      }
    );
    return () => subscription.remove();
  }, [pendingReviewConfirm]);

  const handlePressReviewReward = useCallback(async () => {
    if (hasReceivedReward) {
      Alert.alert('안내', '이미 리뷰 이벤트에 참여하셨습니다.');
      return;
    }
    try {
      await openStoreForReview();
      setPendingReviewConfirm(true);
    } catch (e) {
      console.error('openStoreForReview error:', e);
      Alert.alert('오류', '스토어를 열 수 없습니다.');
    }
  }, [hasReceivedReward]);

  const handleConfirmReviewDone = useCallback(async () => {
    if (!userId) return;
    setShowReviewConfirmModal(false);
    setIsGranting(true);
    try {
      const platform = Platform.OS === 'android' ? 'android' : 'ios';
      const { newBalance } = await grantReviewReward(userId, platform);
      setHasReceivedReward(true);
      Alert.alert(
        '리워드 지급 완료',
        `사바 ${REVIEW_REWARD_SAHA}개가 지급되었습니다. (잔액: ${newBalance})`
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '리워드 지급에 실패했습니다.';
      Alert.alert('안내', message);
    } finally {
      setIsGranting(false);
    }
  }, [userId]);

  const handleCloseReviewConfirmModal = useCallback(() => {
    setShowReviewConfirmModal(false);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          !hasReceivedReward && !rewardCardDismissed && styles.scrollContentNoTopPadding,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {!hasReceivedReward && !rewardCardDismissed && (
          <View style={styles.rewardCard}>
            <TouchableOpacity
              style={styles.rewardCardCloseButton}
              onPress={() => setRewardCardDismissed(true)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.rewardCardCloseText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.rewardCardHeader}>
              <Text style={styles.rewardCardTitle}>리뷰 작성 이벤트</Text>
            </View>
            <Text style={styles.rewardCardDesc}>
              스토어 리뷰 작성 하고 {REVIEW_REWARD_SAHA} 사바 받기 (1회 한정)
            </Text>
            {isCheckingReward ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color={Colors.primaryColor} />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.rewardButton}
                onPress={handlePressReviewReward}
                disabled={isGranting}
              >
                <Text style={styles.rewardButtonText}>리뷰 작성하러 가기</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        <Text style={styles.title}>상점</Text>
      </ScrollView>
      <ConfirmModal
        visible={showReviewConfirmModal}
        onClose={handleCloseReviewConfirmModal}
        title="리뷰 작성 확인"
        message={'소중한 리뷰 감사합니다.\n작성 완료하시면 사바를 지급해 드려요.'}
        cancelText="아니요"
        confirmText="완료"
        onConfirm={handleConfirmReviewDone}
        confirmDisabled={isGranting}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  scrollContentNoTopPadding: {
    paddingTop: 0,
  },
  rewardCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rewardCardCloseButton: {
    position: 'absolute',
    top: 10,
    right: 6,
    padding: 2,
    zIndex: 1,
  },
  rewardCardCloseText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20,
  },
  rewardCard: {
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    padding: 18,
    paddingTop: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    marginBottom: 18,
  },
  rewardCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  rewardCardDesc: {
    fontSize: 14,
    color: '#616161',
    lineHeight: 19,
    marginBottom: 12,
  },
  loadingWrap: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  rewardButton: {
    backgroundColor: Colors.primaryColor,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  rewardButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default StoreScreen;
