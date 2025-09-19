import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import ExpertCard from '../components/ExpertCard';
import SectionHeader from '../components/SectionHeader';
import { Colors } from '../constants/colors';
import { supabase } from '../utils/supabaseClient';
import { Expert } from '../types/expert';
import { getExpertListCache, setExpertListCache, isExpertListFresh } from '../utils/expertListCache';

interface HomeScreenProps {
  navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const FRESH_MS = 60 * 1000; // 60s
    if (isExpertListFresh(FRESH_MS)) {
      const cached = getExpertListCache();
      if (cached) {
        setExperts(cached);
        setLoading(false);
        // 백그라운드 최신화
        void fetchExperts();
        return;
      }
    }
    fetchExperts();
  }, []);

  const fetchExperts = async () => {
    try {
      const { data, error } = await supabase
        .from('experts')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      const list = data || [];
      setExperts(list);
      setExpertListCache(list); // 성공 시에만 캐시
    } catch (error) {
      console.error('Error fetching experts:', error);
      Alert.alert('오류', '전문가 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleExpertPress = (expert: Expert) => {
    navigation.navigate('ExpertDetail', { expertId: expert.id });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
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
          {/* 3개 사주 메뉴 그리드 */}
          <View style={styles.sajuCard}>
            <SectionHeader 
              title="사주 풀이" 
              description="숨겨진 운명의 실마리를 찾아보세요"
              style={styles.sajuCardHeader}
            />
            <View style={styles.menuGrid}>
            <TouchableOpacity style={styles.menuItem} activeOpacity={0.8}>
              <View style={styles.menuIcon}>
                <Image
                  source={require('../../assets/saju/jeongtong_saju.png')}
                  style={styles.menuIconImage}
                />
              </View>
              <Text style={styles.menuText}>정통사주</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} activeOpacity={0.8}>
              <View style={styles.menuIcon}>
                <Image
                  source={require('../../assets/saju/calendar_saju.png')}
                  style={styles.menuIconImage}
                />
              </View>
              <Text style={styles.menuText}>오늘의 운세</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} activeOpacity={0.8}>
              <View style={styles.menuIcon}>
                <Image
                  source={require('../../assets/saju/newyear_saju.png')}
                  style={styles.menuIconImage}
                />
              </View>
              <Text style={styles.menuText}>신년 운세</Text>
            </TouchableOpacity>
            </View>
          </View>

          <View style={styles.cardsSection}>
            <SectionHeader 
              title="AI 사주 도사" 
              description="언제든 대화할 수 있는 나만의 사주 선생님"
            />
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primaryColor} />
              </View>
            ) : (
              <View style={styles.cardsGrid}>
                {experts.filter(expert => expert.is_online).map(expert => (
                  <ExpertCard
                    key={expert.id}
                    expert={expert}
                    onPress={handleExpertPress}
                  />
                ))}
              </View>
            )}
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
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
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
  sajuCard: {
    backgroundColor: '#fefefe',
    marginHorizontal: 3,
    marginBottom: 15,
    borderRadius: 16,
    paddingVertical: 25,
    paddingHorizontal: 18,
    borderWidth: 0.5,
    borderColor: '#f5f5f5',
    shadowColor: Colors.primaryColor,
    shadowOpacity: 0.09,
    shadowRadius: 5,
  },
  sajuCardHeader: {
    marginTop: -3,
    marginBottom: 5,
    paddingHorizontal: 0,
  },
  cardsSection: {
    width: '100%',
  },
  cardsGrid: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 3,
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
  },
  menuIcon: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  menuIconText: {
    fontSize: 20,
  },
  menuIconImage: {
    width: 31,
    height: 31,
    resizeMode: 'contain',
  },
  menuText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
});

export default HomeScreen;
