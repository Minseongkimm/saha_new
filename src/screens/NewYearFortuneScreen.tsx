import React from 'react';
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

interface NewYearFortuneScreenProps {
  navigation: any;
}

const NewYearFortuneScreen: React.FC<NewYearFortuneScreenProps> = ({ navigation }) => {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  const yearlyFortunes = [
    {
      category: '전체운',
      icon: '🌟',
      score: '★★★★☆',
      description: '새로운 도전과 기회가 많은 한 해가 될 것입니다.',
      color: '#FF6B6B',
    },
    {
      category: '연애운',
      icon: '💕',
      score: '★★★☆☆',
      description: '인연을 만날 기회가 있지만 서두르지 마세요.',
      color: '#FF8E8E',
    },
    {
      category: '재물운',
      icon: '💰',
      score: '★★★★★',
      description: '재정적으로 안정되고 투자에 좋은 시기입니다.',
      color: '#4ECDC4',
    },
    {
      category: '건강운',
      icon: '💪',
      score: '★★★☆☆',
      description: '규칙적인 생활과 운동이 중요한 시기입니다.',
      color: '#45B7D1',
    },
    {
      category: '직장운',
      icon: '💼',
      score: '★★★★☆',
      description: '승진이나 이직의 기회가 찾아올 수 있습니다.',
      color: '#96CEB4',
    },
    {
      category: '학업운',
      icon: '📚',
      score: '★★★★★',
      description: '집중력이 높아져 학습 효과가 뛰어날 것입니다.',
      color: '#FECA57',
    },
  ];

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="신년운세"
        onBackPress={() => navigation.goBack()}
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <SectionHeader 
            title={`${nextYear}년 신년운세`}
            description="새해를 맞아 한 해 운세를 미리 확인해보세요"
          />

          <View style={styles.yearCard}>
            <Image
              source={require('../../assets/saju/newyear_saju.png')}
              style={styles.yearIcon}
            />
            <Text style={styles.yearText}>{nextYear}년</Text>
            <Text style={styles.yearSubtext}>을사년 청목뱀띠해</Text>
            <Text style={styles.yearDescription}>
              변화와 성장의 해, 새로운 시작을 준비하세요
            </Text>
          </View>

          <View style={styles.fortuneContainer}>
            <Text style={styles.sectionTitle}>분야별 운세</Text>
            {yearlyFortunes.map((fortune, index) => (
              <View key={index} style={styles.fortuneItem}>
                <View style={[styles.fortuneIcon, { backgroundColor: fortune.color + '20' }]}>
                  <Text style={styles.fortuneEmoji}>{fortune.icon}</Text>
                </View>
                <View style={styles.fortuneContent}>
                  <View style={styles.fortuneHeader}>
                    <Text style={styles.fortuneCategory}>{fortune.category}</Text>
                    <Text style={styles.fortuneScore}>{fortune.score}</Text>
                  </View>
                  <Text style={styles.fortuneDescription}>{fortune.description}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.monthlyCard}>
            <Text style={styles.monthlyTitle}>월별 주요 운세</Text>
            <View style={styles.monthlyGrid}>
              <View style={styles.monthlyItem}>
                <Text style={styles.monthlyMonth}>1-3월</Text>
                <Text style={styles.monthlyText}>새로운 시작</Text>
              </View>
              <View style={styles.monthlyItem}>
                <Text style={styles.monthlyMonth}>4-6월</Text>
                <Text style={styles.monthlyText}>발전과 성장</Text>
              </View>
              <View style={styles.monthlyItem}>
                <Text style={styles.monthlyMonth}>7-9월</Text>
                <Text style={styles.monthlyText}>안정과 휴식</Text>
              </View>
              <View style={styles.monthlyItem}>
                <Text style={styles.monthlyMonth}>10-12월</Text>
                <Text style={styles.monthlyText}>결실과 마무리</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.detailButton}
            onPress={() => navigation.navigate('SajuInfo')}
          >
            <Text style={styles.detailButtonText}>상세 신년운세 보기</Text>
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
  yearCard: {
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
  yearIcon: {
    width: 60,
    height: 60,
    marginBottom: 12,
  },
  yearText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  yearSubtext: {
    fontSize: 16,
    color: Colors.primaryColor,
    fontWeight: '600',
    marginBottom: 8,
  },
  yearDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  fortuneContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  fortuneItem: {
    flexDirection: 'row',
    backgroundColor: '#fefefe',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: '#f5f5f5',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  fortuneIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  fortuneEmoji: {
    fontSize: 20,
  },
  fortuneContent: {
    flex: 1,
  },
  fortuneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  fortuneCategory: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  fortuneScore: {
    fontSize: 14,
    color: '#FFD700',
  },
  fortuneDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  monthlyCard: {
    backgroundColor: '#fefefe',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    borderWidth: 0.5,
    borderColor: '#f5f5f5',
    shadowColor: Colors.primaryColor,
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  monthlyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  monthlyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  monthlyItem: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  monthlyMonth: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryColor,
    marginBottom: 4,
  },
  monthlyText: {
    fontSize: 12,
    color: '#666',
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

export default NewYearFortuneScreen;
