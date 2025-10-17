import React, { useState, useEffect, useRef } from 'react';
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
import CategoryChipStyle from '../components/CategoryChipStyle';
import CategoryExpertSection from '../components/CategoryExpertSection';
import { Colors } from '../constants/colors';
import { supabase } from '../utils/supabaseClient';
import { Expert, EXPERT_CATEGORIES } from '../types/expert';
import { getExpertListCache, setExpertListCache, isExpertListFresh } from '../utils/expertListCache';
import { getCachedNewYearFortune, clearNewYearFortuneCache } from '../utils/newYearFortuneCache';
import { SajuCache } from '../utils/sajuCache';
import { TodayFortuneCache } from '../utils/todayFortuneCache';
import LoadingScreen from './LoadingScreen';

interface HomeScreenProps {
  navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCacheInfo, setShowCacheInfo] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('comprehensive');
  const scrollViewRef = useRef<ScrollView>(null);
  const categoryRefs = useRef<{ [key: string]: View | null }>({});

  useEffect(() => {
    const FRESH_MS = 30 * 60 * 1000; // 30분
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
        .select(`
          *,
          expert_details(*)
        `)
        .order('created_at', { ascending: true });

      if (error) throw error;
      const list = data || [];
      
      setExperts(list);
      setExpertListCache(list);
    } catch (error) {
      console.error('Error fetching experts:', error);
      Alert.alert('오류', '전문가 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 캐시 정보 확인
  const checkCacheInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const sajuCache = await SajuCache.getCachedCalculatedSaju(user.id);
    const todayCache = await TodayFortuneCache.getCachedTodayFortune(user.id, new Date().toISOString().split('T')[0]);
    const newYearCache = await getCachedNewYearFortune(user.id, 2026);

    console.log('=== 캐시 정보 ===');
    console.log('사주 캐시:', sajuCache ? '있음' : '없음');
    console.log('오늘운세 캐시:', todayCache ? '있음' : '없음');
    console.log('신년운세 캐시:', newYearCache ? '있음' : '없음');
    
    if (sajuCache) {
      console.log('사주 캐시 데이터:', sajuCache);
    }
    if (todayCache) {
      console.log('오늘운세 캐시 데이터:', todayCache);
    }
    if (newYearCache) {
      console.log('신년운세 캐시 데이터:', newYearCache);
    }
    console.log('================');
  };

  // 모든 캐시 삭제
  const clearAllCache = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      console.log('=== 캐시 삭제 시작 ===');
      await SajuCache.clearCalculatedSajuCache(user.id);
      console.log('사주 캐시 삭제 완료');
      
      await TodayFortuneCache.clearTodayFortuneCache(user.id);
      console.log('오늘운세 캐시 삭제 완료');
      
      await clearNewYearFortuneCache(user.id, 2026);
      console.log('신년운세 캐시 삭제 완료');
      
      console.log('=== 모든 캐시 삭제 완료 ===');
    } catch (error) {
      console.error('캐시 삭제 중 오류:', error);
    }
  };

  // 개별 캐시 삭제 함수들
  const clearSajuCache = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      console.log('=== 사주 캐시 삭제 ===');
      await SajuCache.clearCalculatedSajuCache(user.id);
      console.log('사주 캐시 삭제 완료');
    } catch (error) {
      console.error('사주 캐시 삭제 중 오류:', error);
    }
  };

  const clearTodayCache = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      console.log('=== 오늘운세 캐시 삭제 ===');
      await TodayFortuneCache.clearTodayFortuneCache(user.id);
      console.log('오늘운세 캐시 삭제 완료');
    } catch (error) {
      console.error('오늘운세 캐시 삭제 중 오류:', error);
    }
  };

  const clearNewYearCache = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      console.log('=== 신년운세 캐시 삭제 ===');
      await clearNewYearFortuneCache(user.id, 2026);
      console.log('신년운세 캐시 삭제 완료');
    } catch (error) {
      console.error('신년운세 캐시 삭제 중 오류:', error);
    }
  };

  const handleExpertPress = (expert: Expert) => {
    navigation.navigate('ExpertDetail', { expertId: expert.id });
  };

  // 카테고리 선택 핸들러
  const handleCategoryPress = (category: string) => {
    setSelectedCategory(category);
    // 약간의 지연 후 스크롤하여 상태 업데이트가 먼저 완료되도록 함
    setTimeout(() => {
      scrollToCategory(category);
    }, 100);
  };

  // 카테고리로 스크롤하는 함수
  const scrollToCategory = (category: string) => {
    const categoryRef = categoryRefs.current[category];
    if (categoryRef && scrollViewRef.current) {
      // measureInWindow를 사용하여 더 안정적인 위치 측정
      categoryRef.measureInWindow((x, y, width, height) => {
        if (scrollViewRef.current && y > 0) {
          // 현재 스크롤 위치를 고려하여 스크롤
          scrollViewRef.current.scrollTo({ 
            y: Math.max(0, y - 120), // 상단 여백을 위해 120px 위로, 최소 0
            animated: true 
          });
        }
      });
    }
  };

  // 로딩 화면 테스트 함수
  const testLoading = () => {
    navigation.navigate('Loading');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
      >
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
            <TouchableOpacity 
              style={styles.menuItem} 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('JeongtongSaju')}
            >
              <View style={styles.menuIcon}>
                <Image
                  source={require('../../assets/saju/jeongtong_saju.png')}
                  style={styles.menuIconImage}
                />
              </View>
              <Text style={styles.menuText}>정통사주</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem} 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('TodayFortune')}
            >
              <View style={styles.menuIcon}>
                <Image
                  source={require('../../assets/saju/calendar_saju.png')}
                  style={styles.menuIconImage}
                />
              </View>
              <Text style={styles.menuText}>오늘의 운세</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem} 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('NewYearFortune')}
            >
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

          {/* 캐시 관리 버튼 */}
          {/* <View style={styles.cacheSection}>
            <TouchableOpacity 
              style={styles.cacheButton} 
              onPress={checkCacheInfo}
            >
              <Text style={styles.cacheButtonText}>캐시 확인</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.cacheButton, styles.clearButton]} 
              onPress={clearAllCache}
            >
              <Text style={styles.cacheButtonText}>전체 삭제</Text>
            </TouchableOpacity>
          </View> */}

          {/* 개별 캐시 삭제 버튼 */}
          {/* <View style={styles.individualCacheSection}>
            <TouchableOpacity 
              style={[styles.individualCacheButton, styles.sajuCacheButton]} 
              onPress={clearSajuCache}
            >
              <Text style={styles.individualCacheButtonText}>사주 캐시 삭제</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.individualCacheButton, styles.todayCacheButton]} 
              onPress={clearTodayCache}
            >
              <Text style={styles.individualCacheButtonText}>오늘운세 캐시 삭제</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.individualCacheButton, styles.newYearCacheButton]} 
              onPress={clearNewYearCache}
            >
              <Text style={styles.individualCacheButtonText}>신년운세 캐시 삭제</Text>
            </TouchableOpacity>
          </View> */}

          {/* 로딩 화면 테스트 버튼 */}
          {/* <View style={styles.testSection}>
            <Text style={styles.testTitle}>로딩 화면 테스트</Text>
            <TouchableOpacity 
              style={styles.testButton} 
              onPress={testLoading}
            >
              <Text style={styles.testButtonText}>로딩 화면 보기</Text>
            </TouchableOpacity>
          </View> */}

          {/* AI 사주 도사 섹션 */}
          <View style={styles.expertSection}>
            <SectionHeader 
              title="AI 사주 도사" 
              description="언제든 대화할 수 있는 나만의 사주 선생님"
            />
            
            {/* 카테고리 선택기 */}
            <View style={styles.allStylesContainer}>
              <CategoryChipStyle
                selectedCategory={selectedCategory}
                onCategoryPress={handleCategoryPress}
              />
            </View>

            {/* 카테고리별 도사 섹션들 (기존 사주 메뉴 카테고리 제외) */}
            {Object.keys(EXPERT_CATEGORIES)
              .filter(category => !['traditional_saju', 'today_fortune', 'newyear_fortune'].includes(category))
              .map((category) => (
                <View
                  key={category}
                  ref={(ref) => {
                    categoryRefs.current[category] = ref;
                  }}
                >
                  <CategoryExpertSection
                    category={category}
                    experts={experts.filter(expert => expert.is_online)}
                    loading={loading}
                    onExpertPress={handleExpertPress}
                  />
                </View>
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
    shadowOpacity: 0.08,
    shadowRadius: 15,
  },
  sajuCardHeader: {
    marginTop: -3,
    marginBottom: 5,
    paddingHorizontal: 0,
  },
  expertSection: {
    width: '100%',
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
  cacheSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  cacheButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  clearButton: {
    backgroundColor: '#ff6b6b',
  },
  cacheButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  individualCacheSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  individualCacheButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginHorizontal: 2,
    marginVertical: 2,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  sajuCacheButton: {
    backgroundColor: '#e3f2fd',
    borderColor: '#bbdefb',
  },
  todayCacheButton: {
    backgroundColor: '#f3e5f5',
    borderColor: '#ce93d8',
  },
  newYearCacheButton: {
    backgroundColor: '#e8f5e8',
    borderColor: '#a5d6a7',
  },
  individualCacheButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  testSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  testTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  testButton: {
    backgroundColor: Colors.primaryColor,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },
  allStylesContainer: {
    marginBottom: 0,
  },
});

export default HomeScreen;
