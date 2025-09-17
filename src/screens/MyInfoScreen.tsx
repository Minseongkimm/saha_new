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

interface MyInfoScreenProps {
  navigation: any;
}

const MyInfoScreen: React.FC<MyInfoScreenProps> = ({ navigation }) => {
  const [userName, setUserName] = useState('사용자');
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [dayGan, setDayGan] = useState('水'); // 일간 오행

  // 일간에서 오행 추출
  const getElementFromDayGan = (dayGanjiChar: string): string => {
    const elementMap: { [key: string]: string } = {
      '甲': '木', '乙': '木', // 갑을목
      '丙': '火', '丁': '火', // 병정화
      '戊': '土', '己': '土', // 무기토
      '庚': '金', '辛': '金', // 경신금
      '壬': '水', '癸': '水', // 임계수
    };
    return elementMap[dayGanjiChar] || '水';
  };

  // 오행에 맞는 색상 가져오기
  const getElementColor = (element: string): string => {
    const colorMap: { [key: string]: string } = {
      '木': '#2E7D32', // 녹색 (목)
      '火': '#D32F2F', // 빨간색 (화)
      '土': '#F57C00', // 주황색 (토)
      '金': '#FFD700', // 금색 (금)
      '水': '#1976D2', // 파란색 (수)
    };
    return colorMap[element] || '#1976D2';
  };

  // 오행에 맞는 배경색 가져오기
  const getElementBackgroundColor = (element: string): string => {
    const backgroundMap: { [key: string]: string } = {
      '木': '#E8F5E8', // 연한 녹색
      '火': '#FFEBEE', // 연한 빨간색
      '土': '#FFF3E0', // 연한 주황색
      '金': '#FFFDE7', // 연한 금색
      '水': '#E3F2FD', // 연한 파란색
    };
    return backgroundMap[element] || '#E3F2FD';
  };

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

      // 사주 정보에서 일간 오행 가져오기
      const { data: birthData, error: birthError } = await supabase
        .from('birth_infos')
        .select('saju_data')
        .eq('user_id', user.id)
        .single();

      if (birthData?.saju_data?.dayHangulGanji) {
        // 일간 한글 간지에서 첫 글자 추출 (예: "임수" -> "임")
        const dayGanChar = birthData.saju_data.dayHangulGanji[0];
        // 한글을 한자로 변환
        const ganjiMap: { [key: string]: string } = {
          '갑': '甲', '을': '乙', '병': '丙', '정': '丁', '무': '戊',
          '기': '己', '경': '庚', '신': '辛', '임': '壬', '계': '癸'
        };
        const dayGanHanja = ganjiMap[dayGanChar] || '壬';
        const element = getElementFromDayGan(dayGanHanja);
        setDayGan(element);
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    } finally {
      setLoading(false);
    }
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
              navigation.replace('Login');
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
          <View style={styles.profileImageContainer}>
            <View style={[
              styles.profileImage, 
              { backgroundColor: getElementBackgroundColor(dayGan) }
            ]}>
              <Text style={[
                styles.profileText, 
                { color: getElementColor(dayGan) }
              ]}>{dayGan}</Text>
            </View>
          </View>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>
        </View>

        {/* 결제 기능 임시 비활성화 */}
        {/* <View style={styles.section}>
          <Text style={styles.sectionTitle}>결제</Text>
          <View style={styles.paymentCard}>
            <View style={styles.balanceSection}>
              <View style={styles.balanceLeft}>
                <View style={styles.coinIcon}>
                  <Image 
                    source={require('../../assets/money/sangpyeong.jpg')} 
                    style={styles.coinImage}
                  />
                </View>
                <Text style={styles.balanceAmount}>1,250</Text>
              </View>
              <TouchableOpacity 
                style={styles.chargeButton}
                onPress={() => navigation.navigate('Charge')}
              >
                <Text style={styles.chargeButtonText}>상평통보 충전</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View> */}

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
          <TouchableOpacity style={[styles.menuItem, styles.logoutButton]} onPress={handleLogout}>
            <Text style={[styles.menuText, styles.logoutText]}>로그아웃</Text>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.developerInfo}>
          <Text style={styles.developerText}>© 2024 Saha App</Text>
          <Text style={styles.developerText}>개발자: Saha Team</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  chargeButton: {
    backgroundColor: Colors.primaryColor,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
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
    width: 30,
    height: 30,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 2,
    paddingTop: 2,
  },
  coinImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  balanceAmount: {
    fontSize: 24,
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
    borderBottomWidth: 0,
  },
  logoutText: {
    color: '#ff4757',
  },
  developerInfo: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  developerText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
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
