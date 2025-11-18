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
  Alert,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SectionHeader from '../../components/common/SectionHeader';
import CategoryChipStyle from '../../components/expert/CategoryChipStyle';
import CategoryExpertSection from '../../components/expert/CategoryExpertSection';
import BannerModal from '../../components/bottomsheets/BannerModal';
import { Colors } from '../../constants/colors';
import { supabase } from '../../utils/database/supabaseClient';
import { Expert, EXPERT_CATEGORIES } from '../../types/expert';
import { getExpertListCache, setExpertListCache, isExpertListFresh } from '../../utils/expert/expertListCache';
// import CacheDebugPanel from '../../components/CacheDebugPanel'; // 디버깅이 필요할 때 주석 해제
import { ensureBirthInfoOrNavigate } from '../../utils/user/birthInfoGuard';
import { TodayFortuneCache } from '../../utils/today-fortune/todayFortuneCache';
import { SajuCache } from '../../utils/saju/sajuCache';
import { clearAllNewYearFortuneCache } from '../../utils/new-year-fortune/newYearFortuneCache';

interface HomeScreenProps {
  navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCacheInfo, setShowCacheInfo] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('comprehensive');
  const [showBannerModal, setShowBannerModal] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const categoryRefs = useRef<{ [key: string]: View | null }>({});

  useEffect(() => {
    const FRESH_MS = 24 * 60 * 60 * 1000; // 24시간
    if (isExpertListFresh(FRESH_MS)) {
      const cached = getExpertListCache();
      if (cached) {
        setExperts(cached);
        setLoading(false);
        // 백그라운드 최신화
        void (async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await fetchExperts();
          }
        })();
        return;
      }
    }
    // 세션이 준비되면 호출 (안드에서 복원 지연 대비)
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await fetchExperts();
        return;
      }
      // 짧은 지연 후 1회 재시도
      await new Promise((r) => setTimeout(r, 400));
      const { data: { user: user2 } } = await supabase.auth.getUser();
      if (user2) {
        await fetchExperts();
        return;
      }
      // 인증 이벤트로 1회만 트리거
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
        if (session?.user) {
          void fetchExperts();
          subscription.unsubscribe();
        }
      });
    })();
    
    // 앱 시작 시 배너 모달 표시 확인
    checkAndShowBannerModal();
  }, []);

  const checkAndShowBannerModal = async () => {
    try {
      // 오늘 하루동안 닫기 상태 확인
      const closedDate = await AsyncStorage.getItem('banner_closed_date');
      const today = new Date().toDateString();
      
      if (closedDate !== today) {
        // 오늘 닫지 않았으면 모달 표시
        setTimeout(() => {
          setShowBannerModal(true);
        }, 500); // 0.5초 후에 모달 표시
      }
    } catch (error) {
      console.error('Error checking banner close date:', error);
    }
  };

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


  const handleExpertPress = (expert: Expert) => {
    navigation.navigate('ExpertDetail', { expertId: expert.id });
  };

  const handleBannerPress = () => {
    // 배너 클릭 시 BannerDetailScreen으로 직접 이동
    navigation.navigate('BannerDetail');
  };

  const handleCloseBannerModal = () => {
    setShowBannerModal(false);
  };

  // 테스트용: 오늘의 운세 캐시 삭제
  const handleClearTodayFortuneCache = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      await TodayFortuneCache.clearTodayFortuneCache(user.id);
      Alert.alert('완료', '오늘의 운세 캐시가 삭제되었습니다.');
    } catch (error) {
      console.error('캐시 삭제 실패:', error);
      Alert.alert('오류', '캐시 삭제에 실패했습니다.');
    }
  };

  // 테스트용: 정통사주 캐시 삭제
  const handleClearTraditionalSajuCache = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      await SajuCache.clearUserCache(user.id);
      Alert.alert('완료', '정통사주 캐시가 삭제되었습니다.');
    } catch (error) {
      console.error('캐시 삭제 실패:', error);
      Alert.alert('오류', '캐시 삭제에 실패했습니다.');
    }
  };

  // 테스트용: 신년운세 캐시 삭제
  const handleClearNewYearFortuneCache = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      await clearAllNewYearFortuneCache(user.id);
      Alert.alert('완료', '신년운세 캐시가 삭제되었습니다.');
    } catch (error) {
      console.error('캐시 삭제 실패:', error);
      Alert.alert('오류', '캐시 삭제에 실패했습니다.');
    }
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


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
      >
        {/* 배너 섹션 */}
        <TouchableOpacity 
          style={styles.bannerSection} 
          onPress={handleBannerPress}
          activeOpacity={0.9}
        >
          <Image
            source={require('../../../assets/banner/home_banner2.jpg')}
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
              onPress={async () => {
                const ok = await ensureBirthInfoOrNavigate(navigation, 'JeongtongSaju');
                if (!ok) return;
                navigation.navigate('JeongtongSaju');
              }}
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
              onPress={async () => {
                const ok = await ensureBirthInfoOrNavigate(navigation, 'TodayFortune');
                if (!ok) return;
                navigation.navigate('TodayFortune');
              }}
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
              onPress={async () => {
                const ok = await ensureBirthInfoOrNavigate(navigation, 'NewYearFortune');
                if (!ok) return;
                navigation.navigate('NewYearFortune');
              }}
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

          {/* 테스트용: 캐시 삭제 버튼들 */}
          {/* <View style={styles.testButtonContainer}>
            <TouchableOpacity
              style={styles.testButton}
              onPress={handleClearTodayFortuneCache}
              activeOpacity={0.7}
            >
              <Text style={styles.testButtonText}>오늘운세 캐시삭제</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.testButton}
              onPress={handleClearTraditionalSajuCache}
              activeOpacity={0.7}
            >
              <Text style={styles.testButtonText}>정통사주 캐시삭제</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.testButton}
              onPress={handleClearNewYearFortuneCache}
              activeOpacity={0.7}
            >
              <Text style={styles.testButtonText}>신년운세 캐시삭제</Text>
            </TouchableOpacity>
          </View> */}

          {/* 캐시 디버깅 패널 - 필요할 때만 주석 해제 */}
          {/* <CacheDebugPanel /> */}

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
      
      {/* 배너 모달 */}
      <BannerModal 
        visible={showBannerModal}
        onClose={handleCloseBannerModal}
        navigation={navigation}
      />
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
    marginTop: Platform.OS === 'android' ? 0 : 15,
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
    shadowRadius: 13,
    elevation: 0.3,
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
  testButtonContainer: {
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 15,
    flexDirection: 'row',
    gap: 8,
  },
  testButton: {
    flex: 1,
    backgroundColor: '#FF6B6B',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  allStylesContainer: {
    marginBottom: 0,
  },
});

export default HomeScreen;
