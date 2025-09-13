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
          <View style={styles.cardsSection}>
            <Text style={styles.sectionTitle}>AI 사주 도사</Text>
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
  cardsSection: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginTop: 5,
    marginBottom: 10,
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
