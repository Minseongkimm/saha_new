import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Colors } from '../constants/colors';
import CustomHeader from '../components/CustomHeader';

interface BannerDetailScreenProps {
  navigation: any;
}

const BannerDetailScreen: React.FC<BannerDetailScreenProps> = ({ navigation }) => {
  return (
    <View style={styles.container}>
            {/* 커스텀 헤더 */}
      <CustomHeader
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        showLogo={true}
      />

      <ScrollView style={styles.scrollView}>

        {/* 배너 이미지 */}
        <View style={styles.bannerContainer}>
          <Image
            source={require('../../assets/banner/home_banner2.jpg')}
            style={styles.bannerImage}
            resizeMode="cover"
          />
        </View>

        {/* 콘텐츠 */}
        <View style={styles.content}>
          <Text style={styles.title}>사하에 오신 것을 환영합니다</Text>
          <Text style={styles.subtitle}>새로운 경험을 시작해보세요</Text>
          
          <View style={styles.descriptionContainer}>
            <Text style={styles.description}>
              사하는 전통 사주와 현대 기술을 결합한 혁신적인 플랫폼입니다. 
              경험 많은 사주 도사들과 함께 당신의 운명을 탐구하고, 
              인생의 방향을 찾아보세요.
            </Text>
          </View>

          <View style={styles.featureContainer}>
            <Text style={styles.featureTitle}>주요 특징</Text>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🔮</Text>
              <Text style={styles.featureText}>전문 사주 도사 상담</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>📱</Text>
              <Text style={styles.featureText}>편리한 모바일 서비스</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🎯</Text>
              <Text style={styles.featureText}>개인 맞춤형 운세 분석</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.startButton}>
            <Text style={styles.startButtonText}>지금 시작하기</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },


  bannerContainer: {
    height: 200,
    margin: 15,
    borderRadius: 15,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  descriptionContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  description: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
    textAlign: 'center',
  },
  featureContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  featureText: {
    fontSize: 16,
    color: '#555',
    flex: 1,
  },
  startButton: {
    backgroundColor: Colors.primaryColor,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default BannerDetailScreen;
