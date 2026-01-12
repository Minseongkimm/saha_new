import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import SectionHeader from '../../components/common/SectionHeader';
import { Colors } from '../../constants/colors';
import { ensureBirthInfoOrNavigate } from '../../utils/user/birthInfoGuard';
import { isIPad } from '../../utils/platform';

const IS_IPAD = isIPad();

interface HomeScreenProps {
  navigation: any;
}

interface PremiumCard {
  id: string;
  title: string;
  subtitle: string;
}

const premiumItems: PremiumCard[] = [
  {
    id: 'deep-read',
    title: 'Deep Insight',
    subtitle: '하루 컨디션과 키 포인트를 정리한 심층 리포트',
  },
  {
    id: 'love-pack',
    title: 'Relationship Pack',
    subtitle: '상대와의 대화 포인트, 오늘의 액션 체크리스트',
  },
  {
    id: 'focus-briefing',
    title: 'Focus Briefing',
    subtitle: '오늘 해야 할 것만 뽑아주는 초간단 브리핑',
  },
];

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const handleNavigate = async (route: string) => {
    const ok = await ensureBirthInfoOrNavigate(navigation, route);
    if (!ok) return;
    navigation.navigate(route);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>AI Companion</Text>
          </View>
          <Text style={styles.heroTitle}>대화로 시작하는 나만의 가이드</Text>
          <Text style={styles.heroSubtitle}>
            GPT 스타일로 바로 묻고 답하며 오늘의 방향을 잡아보세요.
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.sajuCard}>
            <SectionHeader
              title="무료 사주 풀이"
              description="기본 풀이를 무료로 확인하세요"
              style={styles.sajuCardHeader}
            />
            <View style={styles.menuGrid}>
              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.8}
                onPress={() => handleNavigate('JeongtongSaju')}
              >
                <View style={styles.menuIcon}>
                  <Image
                    source={require('../../../assets/saju/jeongtong_saju.png')}
                    style={styles.menuIconImage}
                  />
                </View>
                <Text style={styles.menuText}>정통사주</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.8}
                onPress={() => handleNavigate('TodayFortune')}
              >
                <View style={styles.menuIcon}>
                  <Image
                    source={require('../../../assets/saju/calendar_saju.png')}
                    style={styles.menuIconImage}
                  />
                </View>
                <Text style={styles.menuText}>오늘의 운세</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.8}
                onPress={() => handleNavigate('NewYearFortune')}
              >
                <View style={styles.menuIcon}>
                  <Image
                    source={require('../../../assets/saju/newyear_saju.png')}
                    style={styles.menuIconImage}
                  />
                </View>
                <Text style={styles.menuText}>신년 운세</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.premiumSection}>
            <SectionHeader
              title="프리미엄 콘텐츠"
              description="대화 이후 더 깊게 보고 싶을 때"
            />
            {premiumItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.premiumCard}
                activeOpacity={0.85}
              >
                <View style={styles.premiumTextArea}>
                  <Text style={styles.premiumTitle}>{item.title}</Text>
                  <Text style={styles.premiumSubtitle}>{item.subtitle}</Text>
                </View>
                <View style={styles.premiumBadge}>
                  <Text style={styles.premiumBadgeText}>Premium</Text>
                </View>
              </TouchableOpacity>
            ))}
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
  heroCard: {
    backgroundColor: '#0E1116',
    marginHorizontal: IS_IPAD ? 22 : 16,
    marginTop: IS_IPAD ? 20 : 14,
    marginBottom: IS_IPAD ? 12 : 8,
    borderRadius: IS_IPAD ? 26 : 18,
    padding: IS_IPAD ? 30 : 22,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1F2937',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
  },
  heroBadgeText: {
    color: '#C7D2FE',
    fontWeight: '700',
    fontSize: IS_IPAD ? 16 : 12,
  },
  heroTitle: {
    color: 'white',
    fontSize: IS_IPAD ? 28 : 20,
    fontWeight: '800',
    marginBottom: 8,
    lineHeight: IS_IPAD ? 36 : 28,
  },
  heroSubtitle: {
    color: '#E5E7EB',
    fontSize: IS_IPAD ? 18 : 14,
    lineHeight: IS_IPAD ? 26 : 22,
  },
  content: {
    padding: 10,
    backgroundColor: 'white',
  },
  sajuCard: {
    backgroundColor: '#fefefe',
    marginHorizontal: IS_IPAD ? 20 : 3,
    marginBottom: IS_IPAD ? 22 : 16,
    borderRadius: IS_IPAD ? 22 : 16,
    paddingVertical: IS_IPAD ? 32 : 24,
    paddingHorizontal: IS_IPAD ? 30 : 18,
    borderWidth: 0.5,
    borderColor: '#f5f5f5',
    shadowColor: Colors.primaryColor,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 0.3,
  },
  sajuCardHeader: {
    marginTop: -3,
    marginBottom: 5,
    paddingHorizontal: 0,
  },
  menuGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 0,
    marginBottom: 0,
  },
  menuItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  menuIcon: {
    width: IS_IPAD ? 80 : 50,
    height: IS_IPAD ? 80 : 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: IS_IPAD ? 6 : 2,
    backgroundColor: '#f4f6fb',
    borderRadius: IS_IPAD ? 18 : 14,
  },
  menuIconImage: {
    width: IS_IPAD ? 48 : 31,
    height: IS_IPAD ? 48 : 31,
    resizeMode: 'contain',
  },
  menuText: {
    fontSize: IS_IPAD ? 18 : 14,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  premiumSection: {
    marginHorizontal: IS_IPAD ? 20 : 3,
    marginTop: IS_IPAD ? 10 : 6,
  },
  premiumCard: {
    backgroundColor: '#0E1116',
    borderRadius: IS_IPAD ? 20 : 16,
    paddingVertical: IS_IPAD ? 22 : 18,
    paddingHorizontal: IS_IPAD ? 22 : 18,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  premiumTextArea: {
    flex: 1,
    paddingRight: 12,
  },
  premiumTitle: {
    color: 'white',
    fontSize: IS_IPAD ? 22 : 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  premiumSubtitle: {
    color: '#E5E7EB',
    fontSize: IS_IPAD ? 18 : 13,
    lineHeight: IS_IPAD ? 26 : 20,
  },
  premiumBadge: {
    backgroundColor: Colors.primaryColor,
    paddingHorizontal: IS_IPAD ? 16 : 12,
    paddingVertical: IS_IPAD ? 10 : 8,
    borderRadius: IS_IPAD ? 16 : 12,
  },
  premiumBadgeText: {
    color: 'white',
    fontSize: IS_IPAD ? 16 : 12,
    fontWeight: '700',
  },
});

export default HomeScreen;
