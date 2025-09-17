import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { Colors } from '../constants/colors';

interface MyInfoScreenProps {
  navigation: any;
}

const MyInfoScreen: React.FC<MyInfoScreenProps> = ({ navigation }) => {
  const handleLogout = () => {
    console.log('로그아웃');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={styles.profileImageContainer}>
            <View style={styles.profileImage}>
              <Text style={styles.profileText}>水</Text>
            </View>
          </View>
          <Text style={styles.userName}>두룸치</Text>
          <Text style={styles.userEmail}>임수일간, 물의사주</Text>
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
    backgroundColor: '#f2f1e8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.primaryColor,
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
});

export default MyInfoScreen;
