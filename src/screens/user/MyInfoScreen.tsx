import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { supabase } from '../../utils/database/supabaseClient';
import { 
  getElementColor, 
  getElementBackgroundColor, 
  getElementFromDayGan,
  koreanToHanja 
} from '../../constants/fiveElements';
import ChargeBottomSheet from '../../components/bottomsheets/ChargeBottomSheet';
import PaymentHistoryBottomSheet from '../../components/bottomsheets/PaymentHistoryBottomSheet';
import ConfirmModal from '../../components/common/ConfirmModal';
import PaymentLoadingModal from '../../components/common/PaymentLoadingModal';
import { fetchUserBalance as fetchUserBalanceUtil, refreshBalance as refreshBalanceUtil } from '../../utils/payments/balance';
import { handleChargeFlow } from '../../utils/payments/chargeFlow';
import { deleteUserAccount } from '../../utils/user/deleteAccount';
import { handleLogout as handleLogoutUtil, getCurrentUserSafely } from '../../utils/user/authUtils';
import SabaLoader from '../../components/common/SabaLoader';
import { isIPad } from '../../utils/platform';
import { useAppConfig } from '../../contexts/AppConfigContext';

const IS_IPAD = isIPad();

interface MyInfoScreenProps {
  navigation: any;
}

const MyInfoScreen: React.FC<MyInfoScreenProps> = ({ navigation }) => {
  const [userName, setUserName] = useState('사용자');
  const [birthDate, setBirthDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [dayGan, setDayGan] = useState('?'); // 일간 오행 (기본값: 없을 무)
  const [hasBirthInfo, setHasBirthInfo] = useState(false); // 생년월일 정보 존재 여부
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [deleteAccountModalVisible, setDeleteAccountModalVisible] = useState(false);
  const [deleteAccountConfirmVisible, setDeleteAccountConfirmVisible] = useState(false);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);


  // 사용자 정보 로드
  useEffect(() => {
    loadUserInfo();
    
    // 화면 포커스 시 프로필 정보 및 잔액 갱신
    const unsubscribe = navigation.addListener('focus', async () => {
      const { status, user } = await getCurrentUserSafely();
      if (status !== 'authenticated' || !user) {
        return;
      }
      await Promise.all([
        fetchUserProfile(user.id),
        fetchUserBalance(user.id),
      ]);
    });
    
    return unsubscribe;
  }, [navigation]);

  const fetchUserProfile = async (userId: string) => {
    // 프로필: 이름/생년월일/사주 정보
    const { status, user } = await getCurrentUserSafely();
    if (status !== 'authenticated' || !user) return;

    // 생년월일 정보 (이름도 함께 조회)
    const { data: birthData } = await supabase
      .from('birth_info')
      .select('id, name, year, month, day')
      .eq('user_id', userId)
      .single();
    
    // 이름: birth_info.name 우선, 없으면 user_metadata, 없으면 "여행객"
    const name = birthData?.name ||
                 user.user_metadata?.name ||
                 user.user_metadata?.full_name ||
                 user.user_metadata?.preferred_username ||
                 user.user_metadata?.user_name ||
                 '사용자';
    setUserName(name);
    
    if (birthData?.year && birthData?.month && birthData?.day) {
      // 생년월일이 있으면 "92/02/06" 형식으로 표시
      const year = birthData.year.toString().slice(-2); // 뒤 2자리만
      const month = birthData.month.toString().padStart(2, '0');
      const day = birthData.day.toString().padStart(2, '0');
      setBirthDate(`${year}/${month}/${day}`);
      setHasBirthInfo(true);
    } else {
      // 생년월일이 없으면 빈 문자열
      setBirthDate('');
      setHasBirthInfo(false);
    }

    // 사주 정보 조회 (calculated_saju 테이블에서)
    if (birthData?.id) {
      const { data: calculatedSaju } = await supabase
        .from('calculated_saju')
        .select('day_hangul_ganji')
        .eq('birth_info_id', birthData.id)
        .single();

      if (calculatedSaju?.day_hangul_ganji) {
        const dayGanChar = calculatedSaju.day_hangul_ganji[0];
        const dayGanHanja = koreanToHanja[dayGanChar as keyof typeof koreanToHanja] || '壬';
        const element = getElementFromDayGan(dayGanHanja);
        setDayGan(element);
      } else {
        setDayGan('?');
      }
    } else {
      setDayGan('?');
    }
  };

  const fetchUserBalance = async (userId: string) => {
    const balance = await fetchUserBalanceUtil(userId);
    setCurrentBalance(balance ?? 0);
  };

  const refreshBalance = async (): Promise<void> => {
    const balance = await refreshBalanceUtil();
    if (balance !== null) setCurrentBalance(balance);
  };

  const loadUserInfo = async () => {
    try {
      // 세션 보장: 안드에서 복원 지연 대비
      let { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        // 짧은 지연 후 1회 재시도
        await new Promise((r) => setTimeout(r, 400));
        ({ data: { user }, error: authError } = await supabase.auth.getUser());
      }

      if (authError || !user) {
        // 인증 이벤트로 1회만 트리거
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
          if (session?.user) {
            void loadUserInfo();
            subscription.unsubscribe();
          }
        });
        return;
      }

      await Promise.all([
        fetchUserProfile(user.id),
        fetchUserBalance(user.id),
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Error loading user info:', error);
      setLoading(false);
    }
  };

  const handleChargeSelect = async (amount: number) => {
    setShowChargeModal(false);
    
    await handleChargeFlow(amount, {
      onSuccess: (newBalance) => {
        // 서버에서 반환된 잔액으로 즉시 업데이트 (서버가 이미 DB에서 조회한 정확한 값)
        setCurrentBalance(newBalance);
      },
      onError: (error) => {
        console.error('충전 오류 상세:', {
          error,
          message: error?.message,
          stack: error?.stack,
          code: (error as any)?.code,
        });
      },
      onLoading: (isLoading) => {
        setIsPaymentLoading(isLoading);
      },
    });
  };

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const executeLogout = async () => {
    setLogoutModalVisible(false);
    try {
      await handleLogoutUtil();
    } catch (error) {
      Alert.alert('오류', '로그아웃에 실패했습니다.');
    }
  };

  const handleDeleteAccount = () => {
    setDeleteAccountModalVisible(true);
  };

  const proceedToDeleteConfirm = () => {
    setDeleteAccountModalVisible(false);
    setDeleteAccountConfirmVisible(true);
  };

  const executeDeleteAccount = async () => {
    setDeleteAccountConfirmVisible(false);
    try {
      const result = await deleteUserAccount();
      const retainedLabelMap: Record<string, string> = {
        payments: '구매내역',
        usages: '사용내역',
        user_balances: '잔액 정보',
      };
      const retainedLabels = result.retainedTables
        .map((table) => retainedLabelMap[table] || table)
        .join(', ');
      const successMessage = retainedLabels.length > 0
        ? `${result.message}\n보관 항목: ${retainedLabels}`
        : result.message;
      Alert.alert('안내', successMessage);
      await handleLogoutUtil();
    } catch (error) {
      console.error('계정 탈퇴 오류:', error);
      Alert.alert('오류', '계정 탈퇴에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <SabaLoader message="내 정보를 불러오는중" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          {/* 사주 모드: 일간 오행 표시 */}
          <View style={[
            styles.profileImage, 
            { backgroundColor: hasBirthInfo && dayGan !== '?' ? getElementBackgroundColor(dayGan) : '#f0f0f0' }
          ]}>
            <Text style={{
              fontSize: IS_IPAD ? 52 : 36,
              fontWeight: 'bold',
              color: hasBirthInfo && dayGan !== '?' ? getElementColor(dayGan) : '#999'
            }}>{dayGan}</Text>
          </View>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.birthDate}>
            {birthDate || '생년월일 입력이 필요합니다'}
          </Text>
        </View>

        {/* 결제 기능 임시 비활성화 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>나의 사바</Text>
          <View style={styles.paymentCard}>
            <View style={styles.balanceSection}>
              <View style={styles.balanceLeft}>
                <View style={styles.coinIcon}>
                  <Image 
                    source={require('../../../assets/money/saha_money.png')} 
                    style={styles.coinImage}
                  />
                </View>
                <Text style={styles.balanceAmount}>{currentBalance}</Text>
              </View>
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={styles.historyButton}
                  onPress={() => setShowHistoryModal(true)}
                >
                  <Text style={styles.historyButtonText}>사용 내역</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.chargeButton}
                  onPress={() => setShowChargeModal(true)}
                >
                  <Text style={styles.chargeButtonText}>충전</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>내 정보</Text>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('SajuInfo')}
          >
            <Text style={styles.menuText}>생년월일 관리</Text>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>설정</Text>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('NotificationSettings')}
          >
            <Text style={styles.menuText}>알림 설정</Text>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>정보</Text>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>앱 버전</Text>
            <Text style={styles.versionText}>1.0.0</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('ContactSupport')}
          >
            <Text style={styles.menuText}>문의하기</Text>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계정 관리</Text>
          <TouchableOpacity style={[styles.menuItem, styles.logoutButton]} onPress={handleLogout}>
            <Text style={[styles.menuText, styles.smallMenuText, styles.logoutText]}>로그아웃</Text>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleDeleteAccount}>
            <Text style={[styles.menuText, styles.smallMenuText, styles.deleteAccountText]}>계정 삭제</Text>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.developerInfo}>
          <Text style={styles.developerText}>© 2025 Saha App</Text>
          <Text style={styles.developerText}>개발: Saha Team</Text>
          <View style={styles.legalRow}>
            <TouchableOpacity 
              style={styles.legalLink} 
              onPress={() => navigation.navigate('Terms', { type: 'terms' })}
            >
              <Text style={styles.legalText}>이용약관</Text>
            </TouchableOpacity>
            <Text style={styles.separator}>l</Text>
            <TouchableOpacity 
              style={styles.legalLink} 
              onPress={() => navigation.navigate('Terms', { type: 'privacy' })}
            >
              <Text style={styles.legalText}>개인정보처리방침</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* 충전 바텀시트 */}
      <ChargeBottomSheet
        visible={showChargeModal}
        onClose={() => setShowChargeModal(false)}
        onSelectCharge={handleChargeSelect}
      />

      {/* 충전 내역 바텀시트 */}
      <PaymentHistoryBottomSheet
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
      />

      {/* 결제 로딩 모달 */}
      <PaymentLoadingModal
        visible={isPaymentLoading}
        message="결제중입니다"
      />

      {/* 로그아웃 확인 모달 */}
      <ConfirmModal
        visible={logoutModalVisible}
        onClose={() => setLogoutModalVisible(false)}
        title="로그아웃"
        message="정말 로그아웃 하시겠습니까?"
        confirmText="확인"
        onConfirm={executeLogout}
      />

      {/* 계정 탈퇴 1단계 모달 */}
      <ConfirmModal
        visible={deleteAccountModalVisible}
        onClose={() => setDeleteAccountModalVisible(false)}
        title="계정 탈퇴"
        message={`나를 알아가기 위한 여정이 끝나신 건가요? \n 그렇다면 저희는 그 결정을 존중합니다.`}
        cancelText="더 이용하기"
        confirmText="탈퇴하기"
        onConfirm={proceedToDeleteConfirm}
      />

      {/* 계정 탈퇴 2단계 최종 확인 모달 */}
      <ConfirmModal
        visible={deleteAccountConfirmVisible}
        onClose={() => setDeleteAccountConfirmVisible(false)}
        title="정말 탈퇴하시겠습니까?"
        message="탈퇴 시 구매내역, 사용내역, 잔액 정보를 제외한 모든 데이터는 삭제되며 복구는 불가능합니다."
        confirmText="탈퇴하기"
        onConfirm={executeDeleteAccount}
      />
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
  profileHeader: {
    alignItems: 'center',
    paddingVertical: Platform.OS === 'android' ? (IS_IPAD ? 30 : 20) : (IS_IPAD ? 40 : 28),
    backgroundColor: 'white',
    marginBottom: -3,
  },
  profileImage: {
    width: IS_IPAD ? 120 : 80,
    height: IS_IPAD ? 120 : 80,
    borderRadius: IS_IPAD ? 60 : 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: IS_IPAD ? 24 : 18,
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: IS_IPAD ? 14 : 10,
  },
  historyButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: IS_IPAD ? 22 : 15,
    paddingVertical: IS_IPAD ? 14 : 10,
    borderRadius: IS_IPAD ? 24 : 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  historyButtonText: {
    fontSize: IS_IPAD ? 18 : 14,
    color: '#666',
    fontWeight: '600',
  },
  chargeButton: {
    backgroundColor: Colors.primaryColor,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: IS_IPAD ? 22 : 15,
    paddingVertical: IS_IPAD ? 14 : 10,
    borderRadius: IS_IPAD ? 24 : 20,
  },
  chargeButtonText: {
    fontSize: IS_IPAD ? 18 : 14,
    color: 'white',
    marginRight: 0,
    fontWeight: '600',
  },
  paymentCard: {
    backgroundColor: 'white',
    borderRadius: IS_IPAD ? 16 : 12,
    padding: IS_IPAD ? 24 : 16,
    marginTop: IS_IPAD ? 12 : 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  balanceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: IS_IPAD ? 8 : 5,
  },
  balanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinIcon: {
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: IS_IPAD ? 14 : 10,
  },
  coinImage: {
    width: IS_IPAD ? 36 : 25,
    height: IS_IPAD ? 36 : 25,
  },
  balanceAmount: {
    fontSize: IS_IPAD ? 32 : 22,
    fontWeight: 'bold',
    color: 'black',
  },
  userName: {
    fontSize: IS_IPAD ? 32 : 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: IS_IPAD ? 12 : 8,
  },
  birthDate: {
    fontSize: IS_IPAD ? 18 : 14,
    color: '#999',
    fontWeight: '600',
  },
  section: {
    backgroundColor: 'white',
    marginBottom: 0,
    paddingHorizontal: IS_IPAD ? 30 : 20,
    paddingBottom: IS_IPAD ? 12 : 8,
  },
  sectionTitle: {
    fontSize: IS_IPAD ? 24 : 18,
    fontWeight: '600',
    color: '#333',
    paddingTop: IS_IPAD ? 28 : 20,
    borderBottomColor: 'transparent',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: IS_IPAD ? 20 : 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    flex: 1,
    fontSize: IS_IPAD ? 20 : 16,
    color: '#333',
    marginLeft: 1,
  },
  smallMenuText: {
    fontSize: IS_IPAD ? 19 : 15,
  },
  versionText: {
    fontSize: IS_IPAD ? 18 : 14,
    color: '#999',
  },
  logoutButton: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logoutText: {
    color: '#666',
  },
  deleteAccountText: {
    color: '#666',
  },
  developerInfo: {
    marginTop: 0,
    alignItems: 'flex-start',
    paddingVertical: IS_IPAD ? 20 : 15,
    paddingHorizontal: IS_IPAD ? 30 : 20,
    paddingTop: IS_IPAD ? 20 : 15,
    paddingBottom: IS_IPAD ? 28 : 20,
    backgroundColor: 'white',
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: IS_IPAD ? 8 : 5,
  },
  legalLink: {
    marginRight: IS_IPAD ? 12 : 8,
  },
  legalText: {
    fontSize: IS_IPAD ? 18 : 14,
    color: '#999',
  },
  separator: {
    fontSize: IS_IPAD ? 18 : 14,
    color: '#ccc',
    marginRight: IS_IPAD ? 12 : 8,
  },
  developerText: {
    fontSize: IS_IPAD ? 18 : 14,
    color: '#999',
    marginBottom: 1,
  },
  arrowIcon: {
    fontSize: IS_IPAD ? 24 : 18,
    color: '#ccc',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: IS_IPAD ? 70 : 50,
  },
});

export default MyInfoScreen;
