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
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../constants/colors';
import { supabase } from '../utils/supabaseClient';
import { 
  getElementColor, 
  getElementBackgroundColor, 
  getElementFromDayGan,
  koreanToHanja 
} from '../constants/fiveElements';
import ChargeBottomSheet from '../components/ChargeBottomSheet';

interface MyInfoScreenProps {
  navigation: any;
}

const MyInfoScreen: React.FC<MyInfoScreenProps> = ({ navigation }) => {
  const [userName, setUserName] = useState('사용자');
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [dayGan, setDayGan] = useState('水'); // 일간 오행
  const [showChargeModal, setShowChargeModal] = useState(false);


  // 사용자 정보 로드
  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        navigation.replace('Login');
        return;
      }

      // 카카오 메타데이터에서 이름 가져오기
      const name = user.user_metadata?.full_name || 
                   user.user_metadata?.name || 
                   user.user_metadata?.preferred_username || 
                   user.user_metadata?.user_name || 
                   user.email?.split('@')[0] || 
                   '사용자';

      setUserName(name);
      setUserEmail(user.email || '');

      // 로딩 완료 (사주 정보는 선택사항)
      setLoading(false);

      // 백그라운드에서 사주 정보 조회
      const { data: birthData, error: birthError } = await supabase
        .from('birth_infos')
        .select('saju_data')
        .eq('user_id', user.id)
        .single();

      if (birthData?.saju_data?.dayHangulGanji) {
        // 일간 한글 간지에서 첫 글자 추출 (예: "임수" -> "임")
        const dayGanChar = birthData.saju_data.dayHangulGanji[0];
        // 한글을 한자로 변환
        const dayGanHanja = koreanToHanja[dayGanChar as keyof typeof koreanToHanja] || '壬';
        const element = getElementFromDayGan(dayGanHanja);
        setDayGan(element);
      }
    } catch (error) {
      console.error('Error loading user info:', error);
      setLoading(false);
    }
  };

  const handleChargeSelect = (amount: number) => {
    setShowChargeModal(false);
    // TODO: 충전 로직 구현
    console.log(`충전 선택: ${amount} 상평통보`);
  };

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃 하시겠습니까?',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              // navigation.replace 대신 세션 상태 변경을 기다림
              // App.tsx의 onAuthStateChange가 자동으로 Login 화면으로 전환
            } catch (error) {
              console.error('로그아웃 오류:', error);
              Alert.alert('오류', '로그아웃에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primaryColor} />
          <Text style={styles.loadingText}>사용자 정보를 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={[
            styles.profileImage, 
            { backgroundColor: getElementBackgroundColor(dayGan) }
          ]}>
            <Text style={{
              fontSize: 36,
              fontWeight: 'bold',
              color: getElementColor(dayGan)
            }}>{dayGan}</Text>
          </View>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>
        </View>

        {/* 결제 기능 임시 비활성화 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>나의 사바</Text>
          <View style={styles.paymentCard}>
            <View style={styles.balanceSection}>
              <View style={styles.balanceLeft}>
                <View style={styles.coinIcon}>
                  <Image 
                    source={require('../../assets/money/saha_money.png')} 
                    style={styles.coinImage}
                  />
                </View>
                <Text style={styles.balanceAmount}>250</Text>
              </View>
                <TouchableOpacity
                  style={styles.chargeButton}
                  onPress={() => setShowChargeModal(true)}
                >
                <Text style={styles.chargeButtonText}>충전</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계정 관리</Text>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('SajuInfo')}
          >
            <Text style={styles.menuText}>사주 정보 관리</Text>
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
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
            <Text style={styles.menuText}>문의하기</Text>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={[styles.menuItem, styles.logoutButton]} onPress={handleLogout}>
            <Text style={[styles.menuText, styles.logoutText]}>로그아웃</Text>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.developerInfo}>
          <Text style={styles.developerText}>© 2025 Saha App</Text>
          <Text style={styles.developerText}>개발: Saha Team</Text>
          <View style={styles.legalRow}>
            <TouchableOpacity style={styles.legalLink} onPress={() => {}}>
              <Text style={styles.legalText}>이용약관</Text>
            </TouchableOpacity>
            <Text style={styles.separator}>l</Text>
            <TouchableOpacity style={styles.legalLink} onPress={() => {}}>
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
    paddingVertical: 30,
    backgroundColor: 'white',
    marginBottom: 0,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  chargeButton: {
    backgroundColor: Colors.primaryColor,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
  },
  chargeButtonText: {
    fontSize: 14,
    color: 'white',
    marginRight: 0,
    fontWeight: '600',
  },
  paymentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  balanceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 5,
  },
  balanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinIcon: {
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  coinImage: {
    width: 25,
    height: 25,
  },
  balanceAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'black',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
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
    paddingTop: 20,
    borderBottomColor: 'transparent',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 1,
  },
  versionText: {
    fontSize: 14,
    color: '#999',
  },
  logoutButton: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logoutText: {
    color: '#ff4757',
  },
  developerInfo: {
    marginTop: 10,
    alignItems: 'flex-start',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: 'white',
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  legalLink: {
    marginRight: 8,
  },
  legalText: {
    fontSize: 14,
    color: '#999',
  },
  separator: {
    fontSize: 14,
    color: '#ccc',
    marginRight: 8,
  },
  developerText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 1,
  },
  arrowIcon: {
    fontSize: 18,
    color: '#ccc',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

export default MyInfoScreen;
