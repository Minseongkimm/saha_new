import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Card from '../components/Card';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../constants/colors';
import { supabase, forceSignOut } from '../utils/supabaseClient';

interface HomeScreenProps {
  navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 로그아웃 테스트용 버튼 */}
        <TouchableOpacity 
          style={styles.loginButton}
          onPress={async () => {
            await forceSignOut();
            navigation.navigate('Login');
          }}
          activeOpacity={0.8}
        >
          <Icon name="log-out-outline" size={20} color="white" />
          <Text style={styles.loginButtonText}>로그아웃</Text>
        </TouchableOpacity>

        {/* 배너 섹션 */}
        <TouchableOpacity 
          style={styles.bannerSection} 
          onPress={() => navigation.navigate('BannerDetail')}
          activeOpacity={0.9}
        >
          <Image
            source={require('../../assets/banner/home_banner2.jpg')}
            style={styles.bannerImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
          
        {/* 사주 메뉴 섹션 */}
        <View style={styles.content}>
          {/* 카드 그리드 섹션 */}
          <View style={styles.cardsSection}>
            <Text style={styles.sectionTitle}>AI 사주 도사</Text>
            <View style={styles.cardsGrid}>
              <Card
                image={require('../../assets/people/hoosi_guy.jpg')}
                title="후시도령"
                subtitle="이사, 거주지"
                description="어디쯤을 생각하고 계십니까? 사주에 맞춰 방향을 짚어보지요."
                onPress={() => navigation.navigate('ExpertDetail', {
                  expert: {
                    image: require('../../assets/people/hoosi_guy.jpg'),
                    title: "후시도령",
                    subtitle: "이사,거주지",
                    description: "어디쯤을 생각하고 계십니까? 사주에 맞춰 방향을 짚어보지요."
                  }
                })}
              />
              <Card
                image={require('../../assets/people/yeonhwa_girl.jpg')}
                title="연화낭자"
                subtitle="연애,인연,궁합"
                description="당신의 사랑과 인연, 사주 속에서 답을 찾아드릴게요."
                onPress={() => navigation.navigate('ExpertDetail', {
                  expert: {
                    image: require('../../assets/people/yeonhwa_girl.jpg'),
                    title: "연화낭자",
                    subtitle: "연애,인연,궁합",
                    description: "당신의 사랑과 인연, 사주 속에서 답을 찾아드릴게요."
                  }
                })}
              />
              <Card
                image={require('../../assets/people/cheongwang_guy.jpg')}
                title="천광"
                subtitle="사주,인생 전반"
                description="사주팔자 속에 담긴 당신의 성향과 길을 풀어드리지요."
                onPress={() => navigation.navigate('ExpertDetail', {
                  expert: {
                    image: require('../../assets/people/cheongwang_guy.jpg'),
                    title: "천광",
                    subtitle: "사주,인생 전반",
                    description: "사주팔자 속에 담긴 당신의 성향과 길을 풀어드리지요."
                  }
                })}
              />
              <Card
                image={require('../../assets/people/sangtong_guy.jpg')}
                title="상통"
                subtitle="금전,재물운"
                description="재물의 흐름과 사업의 운, 사주로 현실적인 길을 알려드립니다."
                onPress={() => navigation.navigate('ExpertDetail', {
                  expert: {
                    image: require('../../assets/people/sangtong_guy.jpg'),
                    title: "상통",
                    subtitle: "금전, 재물운",
                    description: "재물의 흐름과 사업의 운, 사주로 현실적인 길을 알려드립니다."
                  }
                })}
              />
              <Card
                image={require('../../assets/logo/logo_icon.png')}
                title="고객 지원"
                subtitle="문의하기"
                description="문제가 발생했거나 도움이 필요하시면 문의해주세요."
                onPress={() => console.log('지원 카드 클릭')}
              />
              <Card
                image={require('../../assets/logo/logo_icon.png')}
                title="피드백"
                subtitle="의견 제안"
                description="앱 개선을 위한 의견이나 제안사항을 보내주세요."
                onPress={() => console.log('피드백 카드 클릭')}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryColor,
    marginHorizontal: 15,
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bannerSection: {
    height: Dimensions.get('window').height * 0.15,
    width: Dimensions.get('window').width - 30,
    position: 'relative',
    marginTop: 15,
    marginLeft: 15,
    marginRight: 15,
    borderRadius: 15,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    padding: 10,
    backgroundColor: 'white',
  },
  cardsSection: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginTop: 5,
    marginBottom: 4,
    marginLeft: 10,
    textAlign: 'left',
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
});

export default HomeScreen;
