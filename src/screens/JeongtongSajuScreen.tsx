import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../constants/colors';
import SectionHeader from '../components/SectionHeader';
import CustomHeader from '../components/CustomHeader';
import SajuChart from '../components/SajuChart';
import { supabase } from '../utils/supabaseClient';

interface JeongtongSajuScreenProps {
  navigation: any;
}

const JeongtongSajuScreen: React.FC<JeongtongSajuScreenProps> = ({ navigation }) => {
  const [userSajuData, setUserSajuData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserSajuData();
  }, []);

  const loadUserSajuData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // birth_infos 테이블에서 계산된 사주 정보 가져오기
        const { data: birthData, error } = await supabase
          .from('birth_infos')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (birthData && !error) {
          // 계산된 사주 데이터를 SajuChart 컴포넌트에서 사용할 수 있는 형태로 변환
          const formattedData = {
            name: birthData.name || '사용자',
            birthYear: birthData.year,
            birthMonth: birthData.month,
            birthDay: birthData.day,
            birthHour: birthData.hour || 0,
            birthMinute: birthData.minute || 0,
            gender: birthData.gender,
            calendarType: birthData.calendar_type,
            leapMonth: birthData.is_leap_month,
            timeUnknown: birthData.is_time_unknown,
            // 계산된 사주 정보
            calculatedSaju: birthData.saju_data || {},
            pillars: birthData.saju_data?.pillars || {},
            tenGods: birthData.saju_data?.ten_gods || {},
            lifeStages: birthData.saju_data?.life_stages || {},
          };
          setUserSajuData(formattedData);
        }
      }
    } catch (error) {
      console.error('Error loading user saju data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="정통사주"
        onBackPress={() => navigation.goBack()}
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <SectionHeader 
            title="정통 사주팔자" 
            description="전통 사주학으로 당신의 운명을 깊이 있게 분석합니다"
          />

          {/* 사용자 사주 차트 */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primaryColor} />
              <Text style={styles.loadingText}>사주 정보를 불러오는 중...</Text>
            </View>
          ) : userSajuData ? (
            <SajuChart sajuData={userSajuData} />
          ) : (
            <View style={styles.noDataCard}>
              <Text style={styles.noDataTitle}>사주 정보가 없습니다</Text>
              <Text style={styles.noDataDescription}>
                사주 정보를 입력하면 만세력 표를 확인할 수 있습니다
              </Text>
              <TouchableOpacity 
                style={styles.inputButton}
                onPress={() => navigation.navigate('SajuInfo')}
              >
                <Text style={styles.inputButtonText}>사주 정보 입력하기</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.infoCard}>
            <Image
              source={require('../../assets/saju/jeongtong_saju.png')}
              style={styles.mainIcon}
            />
            <Text style={styles.infoTitle}>정통 사주팔자란?</Text>
            <Text style={styles.infoDescription}>
              사주팔자는 태어난 년, 월, 일, 시의 간지(干支)를 바탕으로 한 
              전통적인 운명 분석법입니다. 천간과 지지의 조합을 통해 
              개인의 성격, 운세, 적성 등을 종합적으로 파악할 수 있습니다.
            </Text>
          </View>



          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>정통사주로 알 수 있는 것들</Text>
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Text style={styles.featureBullet}>•</Text>
                <Text style={styles.featureText}>타고난 성격과 기질</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureBullet}>•</Text>
                <Text style={styles.featureText}>인생의 대운과 흐름</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureBullet}>•</Text>
                <Text style={styles.featureText}>직업 적성과 재능</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureBullet}>•</Text>
                <Text style={styles.featureText}>건강과 주의사항</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureBullet}>•</Text>
                <Text style={styles.featureText}>인간관계와 궁합</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.startButton}
            onPress={() => navigation.navigate('SajuInfo')}
          >
            <Text style={styles.startButtonText}>내 정통사주 보기</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  content: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#fefefe',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: '#f5f5f5',
    shadowColor: Colors.primaryColor,
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
    alignItems: 'center',
  },
  mainIcon: {
    width: 60,
    height: 60,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  infoDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    textAlign: 'center',
  },
  featureCard: {
    backgroundColor: '#fefefe',
    borderRadius: 16,
    padding: 24,
    marginBottom: 30,
    borderWidth: 0.5,
    borderColor: '#f5f5f5',
    shadowColor: Colors.primaryColor,
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  featureList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  featureBullet: {
    fontSize: 16,
    color: Colors.primaryColor,
    marginRight: 8,
    marginTop: 2,
  },
  featureText: {
    fontSize: 15,
    color: '#666',
    flex: 1,
    lineHeight: 20,
  },
  startButton: {
    backgroundColor: Colors.primaryColor,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingContainer: {
    backgroundColor: '#fefefe',
    borderRadius: 16,
    padding: 40,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: '#f5f5f5',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
  noDataCard: {
    backgroundColor: '#fefefe',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: '#f5f5f5',
    shadowColor: Colors.primaryColor,
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
    alignItems: 'center',
  },
  noDataTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  noDataDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputButton: {
    backgroundColor: Colors.primaryColor,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  inputButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default JeongtongSajuScreen;
