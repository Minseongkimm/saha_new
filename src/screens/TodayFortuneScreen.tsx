import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Colors } from '../constants/colors';
import SectionHeader from '../components/SectionHeader';
import CustomHeader from '../components/CustomHeader';

interface TodayFortuneScreenProps {
  navigation: any;
}

const TodayFortuneScreen: React.FC<TodayFortuneScreenProps> = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('overall');

  const fortuneCategories = [
    { id: 'overall', name: '종합운', icon: '🌟' },
    { id: 'love', name: '연애운', icon: '💕' },
    { id: 'money', name: '재물운', icon: '💰' },
    { id: 'health', name: '건강운', icon: '💪' },
    { id: 'work', name: '직장운', icon: '💼' },
  ];

  const todayDate = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="오늘의 운세"
        onBackPress={() => navigation.goBack()}
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <SectionHeader 
            title="오늘의 운세" 
            description={`${todayDate}의 운세를 확인해보세요`}
          />

          <View style={styles.dateCard}>
            <Image
              source={require('../../assets/saju/calendar_saju.png')}
              style={styles.calendarIcon}
            />
            <Text style={styles.dateText}>{todayDate}</Text>
            <Text style={styles.dateSubtext}>오늘 하루의 운세</Text>
          </View>

          <View style={styles.categoryContainer}>
            <Text style={styles.categoryTitle}>운세 카테고리</Text>
            <View style={styles.categoryGrid}>
              {fortuneCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryItem,
                    selectedCategory === category.id && styles.categoryItemSelected,
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <Text style={[
                    styles.categoryName,
                    selectedCategory === category.id && styles.categoryNameSelected,
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.fortuneCard}>
            <Text style={styles.fortuneTitle}>
              {fortuneCategories.find(c => c.id === selectedCategory)?.name} 운세
            </Text>
            <Text style={styles.fortuneScore}>★★★★☆</Text>
            <Text style={styles.fortuneDescription}>
              오늘은 새로운 기회가 찾아올 수 있는 날입니다. 
              평소보다 적극적인 자세로 임하면 좋은 결과를 얻을 수 있을 것입니다.
              다만 서두르기보다는 신중하게 판단하는 것이 중요합니다.
            </Text>
            <View style={styles.adviceContainer}>
              <Text style={styles.adviceTitle}>오늘의 조언</Text>
              <Text style={styles.adviceText}>
                • 새로운 도전을 두려워하지 마세요{'\n'}
                • 주변 사람들의 조언에 귀 기울여보세요{'\n'}
                • 건강한 식사와 충분한 휴식을 취하세요
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.detailButton}
            onPress={() => navigation.navigate('SajuInfo')}
          >
            <Text style={styles.detailButtonText}>상세 사주 분석 받기</Text>
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
  dateCard: {
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
  calendarIcon: {
    width: 50,
    height: 50,
    marginBottom: 12,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  dateSubtext: {
    fontSize: 14,
    color: '#666',
  },
  categoryContainer: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: 70,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  categoryItemSelected: {
    backgroundColor: Colors.primaryColor,
    borderColor: Colors.primaryColor,
  },
  categoryIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  categoryNameSelected: {
    color: 'white',
  },
  fortuneCard: {
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
  fortuneTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  fortuneScore: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 16,
  },
  fortuneDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
  },
  adviceContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  adviceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  adviceText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  detailButton: {
    backgroundColor: Colors.primaryColor,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  detailButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default TodayFortuneScreen;
