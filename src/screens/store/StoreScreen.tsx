import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import CategoryChipStyle from '../../components/expert/CategoryChipStyle';
import { getExpertCategoryLabel } from '../../types/expert';
import StoreProductCard from './components/StoreProductCard';

const StoreScreen: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [hasReceivedReward, setHasReceivedReward] = useState<boolean>(false);
  const [isCheckingReward, setIsCheckingReward] = useState<boolean>(true);
  const [showReviewConfirmModal, setShowReviewConfirmModal] = useState<boolean>(false);
  const [pendingReviewConfirm, setPendingReviewConfirm] = useState<boolean>(false);
  const [isGranting, setIsGranting] = useState<boolean>(false);
  const [rewardCardDismissed, setRewardCardDismissed] = useState<boolean>(false);
  const STORE_CATEGORY_KEYS = ['comprehensive', 'love', 'money', 'career', 'health'] as const;
  const [selectedCategory, setSelectedCategory] = useState<string>('comprehensive');
  const scrollViewRef = useRef<ScrollView>(null);
  const categoryRefs = useRef<Record<string, View | null>>({});

  const STORE_PRODUCTS_BY_CATEGORY: Record<
    (typeof STORE_CATEGORY_KEYS)[number],
    Array<{ title: string; description: string; priceInSaba: number }>
  > = {
    comprehensive: [
      {
        title: '사주 리포트',
        description:
          '생년월일시 기반으로 운세와 성향을 분석한 상세 리포트를 받아보세요.',
        priceInSaba: 300,
      },
      {
        title: '종합 운세 리포트',
        description: '한 해의 흐름과 월별 운세를 한눈에 확인해보세요.',
        priceInSaba: 300,
      },
    ],
    love: [
      {
        title: '연애·궁합 리포트',
        description: '연애운과 애정운, 궁합을 분석한 리포트를 받아보세요.',
        priceInSaba: 300,
      },
      {
        title: '결혼운 리포트',
        description: '결혼 시기와 배우자운을 살펴본 상세 리포트입니다.',
        priceInSaba: 300,
      },
    ],
    money: [
      {
        title: '금전운 리포트',
        description: '재물운과 금전운을 분석한 상세 리포트를 받아보세요.',
        priceInSaba: 300,
      },
      {
        title: '재물운 상세 리포트',
        description: '투자·사업·저축운을 구체적으로 분석해드립니다.',
        priceInSaba: 300,
      },
    ],
    career: [
      {
        title: '커리어 리포트',
        description: '직장운과 사업운을 분석한 상세 리포트를 받아보세요.',
        priceInSaba: 300,
      },
      {
        title: '직장·이직운 리포트',
        description: '적성과 진로, 이직 시기를 살펴본 리포트입니다.',
        priceInSaba: 300,
      },
    ],
    health: [
      {
        title: '건강운 리포트',
        description: '건강운과 질병 시기를 살펴본 리포트를 받아보세요.',
        priceInSaba: 300,
      },
      {
        title: '건강 주의 시기 리포트',
        description: '몸 관리가 필요한 시기와 주의점을 정리해드립니다.',
        priceInSaba: 300,
      },
    ],
  };

  const DEFAULT_PRODUCT_IMAGE = require('../../../assets/saju/jeongtong_saju.png');

  const handleCategoryPress = useCallback((category: string) => {
    setSelectedCategory(category);
    setTimeout(() => scrollToCategory(category), 100);
  }, []);

  const scrollToCategory = useCallback((category: string) => {
    if (category === 'comprehensive') {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    const categoryRef = categoryRefs.current[category];
    if (categoryRef && scrollViewRef.current) {
      categoryRef.measureInWindow((_x, y) => {
        if (scrollViewRef.current && y > 0) {
          scrollViewRef.current.scrollTo({
            y: Math.max(0, y - 120),
            animated: true,
          });
        }
      });
    }
  }, []);

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
        ref={scrollViewRef}
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
        <View style={styles.chipContainer}>
          <CategoryChipStyle
            selectedCategory={selectedCategory}
            onCategoryPress={handleCategoryPress}
          />
        </View>
        {STORE_CATEGORY_KEYS.map((categoryKey) => {
          const products = STORE_PRODUCTS_BY_CATEGORY[categoryKey];
          const categoryLabel = getExpertCategoryLabel(categoryKey);
          return (
            <View
              key={categoryKey}
              ref={(ref) => {
                categoryRefs.current[categoryKey] = ref;
              }}
              style={styles.categorySection}
            >
              <Text style={styles.sectionTitle}>{categoryLabel}</Text>
              {products.map((product, index) => (
                <View key={`${categoryKey}-${index}`} style={styles.productCardWrap}>
                  <StoreProductCard
                    imageSource={DEFAULT_PRODUCT_IMAGE}
                    subtitle={categoryLabel}
                    title={product.title}
                    description={product.description}
                    priceInSaba={product.priceInSaba}
                  />
                </View>
              ))}
            </View>
          );
        })}
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
    marginBottom: 4,
  },
  chipContainer: {
    marginBottom: 0,
  },
  categorySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  productCardWrap: {
    marginTop: 12,
    marginBottom: 16,
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
