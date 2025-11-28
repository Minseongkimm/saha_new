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
import { ensureBirthInfoOrNavigate } from '../../utils/user/birthInfoGuard';
import { TestTools } from '../../components/common/TestTools';
import { isIPad } from '../../utils/platform';

const IS_IPAD = isIPad();

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

  // 테스트용: 오늘의 운세 캐시 삭제, 정통사주 캐시 삭제, 신년운세 캐시 삭제, DB 삭제 등은 TestTools 컴포넌트로 이동됨

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
            resizeMode="cover" // 비율에 맞춰 꽉 채움
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

          {/* 테스트 도구 (캐시 및 DB 삭제) - 필요할 때만 주석 해제 */}
          {/* <TestTools /> */}

          {/* AI 사주 도사 섹션 */}
          <View style={styles.expertSection}>
            <SectionHeader 
              title="AI 도사" 
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_SMALL_DEVICE: boolean = SCREEN_HEIGHT < 700;

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
    width: IS_IPAD ? '92%' : SCREEN_WIDTH - 30,
    alignSelf: 'center',
    aspectRatio: IS_IPAD ? 3.3 : (IS_SMALL_DEVICE ? 2.8 : 3.2),
    position: 'relative',
    marginTop: Platform.OS === 'android' ? 0 : (IS_IPAD ? 20 : 15),
    marginLeft: IS_IPAD ? 0 : 15,
    marginRight: IS_IPAD ? 0 : 15,
    borderRadius: IS_IPAD ? 20 : 15,
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
    marginHorizontal: IS_IPAD ? 20 : 3,
    marginBottom: IS_IPAD ? 30 : 15,
    borderRadius: IS_IPAD ? 24 : 16,
    paddingVertical: IS_IPAD ? 40 : 25,
    paddingHorizontal: IS_IPAD ? 30 : 18,
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
    width: IS_IPAD ? 80 : 50,
    height: IS_IPAD ? 80 : 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: IS_IPAD ? 12 : 5,
  },
  menuIconText: {
    fontSize: 20,
  },
  menuIconImage: {
    width: IS_IPAD ? 48 : 31,
    height: IS_IPAD ? 48 : 31,
    resizeMode: 'contain',
  },
  menuText: {
    fontSize: IS_IPAD ? 20 : 14,
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
