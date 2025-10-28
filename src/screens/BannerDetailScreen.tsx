import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/colors';
import CustomHeader from '../components/CustomHeader';

interface BannerDetailScreenProps {
  navigation: any;
}

const BannerDetailScreen: React.FC<BannerDetailScreenProps> = ({ navigation }) => {
  const handleClose = () => {
    navigation.goBack();
  };

  const handleStart = () => {
    navigation.navigate('MainTabs');
  };


  return (
    <View style={styles.container}>
      {/* 커스텀 헤더 */}
      <CustomHeader
        title="이용가이드"
        onBackPress={handleClose}
      />

      <ScrollView style={styles.scrollView}>
        {/* 사바세계 이미지 */}
        <View style={styles.imageContainer}>
          <Image
            source={require('../../assets/guide/saha_world.jpg')}
            style={styles.worldImage}
            resizeMode="cover"
          />
        </View>

        {/* 콘텐츠 */}
        <View style={styles.content}>
        <View style={styles.howItWorksContainer}>
            <Text style={styles.sectionTitle}>사바세계란?</Text>
            
            <View style={styles.processItem}>
              <Text style={styles.processText}>
                사바세계는 괴로움도 기쁨도 함께 품은 세상이란 뜻이에요.
              </Text>
              <Text style={styles.processText}>
                저는 그 속에서 <Text style={styles.boldText}>당신 스스로를 이해하도록 돕는 친구</Text>입니다.
              </Text>
            </View>
          </View>

          <View style={styles.howItWorksContainer}>
            <Text style={styles.sectionTitle}>사바는 이렇게 작동합니다</Text>
            
            <View style={styles.processItem}>
                <Text style={styles.processText}>
                명리학을 기반으로 분석된 사주데이터로 AI가 인생과 성향 그리고 앞으로의 흐름을 대화로 전합니다.
              </Text>
            <View style={styles.processItem}>
              <Text style={styles.processText}>
                결과보다 중요한 건 <Text style={styles.boldText}>당신 자신을 이해하는 과정</Text>입니다.
              </Text>
            </View>
            </View>
          </View>

          <View style={styles.messageContainer}>
            <Text style={styles.sectionTitle}>사바가 당신에게 전하고 싶은 것</Text>
            
            <View style={styles.processItem}>
              <Text style={styles.processText}>
              사바는 당신이 어떤 사람인지 지금 어떤 흐름 속에 있는지를 알려주는 <Text style={styles.boldText}>지도입니다.</Text>
              </Text>
              <View style={styles.processItem}>
                <Text style={styles.processText}>
                  운명을 예언하기보다 <Text style={styles.boldText}>이해하고 활용하는 법을</Text> 알려드립니다.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.messageContainer}>
            <Text style={styles.sectionTitle}>사바 활용법</Text>
              <View style={styles.processItem}>
                <Text style={styles.processText}>
                  연애,일,인생 등 원하는 주제를 선택해 도사와 대화하세요.
                </Text>
                <Text style={styles.processText}>
                  <Text style={styles.boldText}>당신의 흐름을 함께 읽고 방향을 제안</Text>합니다.
                </Text>
              </View>
          </View>

          <View style={styles.sectionImageContainer}>
            <Image
              source={require('../../assets/guide/conversation_example.png')}
              style={styles.sectionImage}
              resizeMode="cover"
            />
        </View>

          <TouchableOpacity style={styles.startButton} onPress={handleStart}>
            <Text style={styles.startButtonText}>사바세계 탐험하기</Text>
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
  scrollView: {
    flex: 1,
    backgroundColor: 'white',
  },
  imageContainer: {
    height: 200,
    marginHorizontal: 15,
    overflow: 'hidden',
    borderRadius: 12,
    marginTop: 2,
  },
  worldImage: {
    width: '100%',
    height: '100%',
  },
  sectionImageContainer: {
    height: 660,
    marginHorizontal: 20,
    marginTop: 0,
    marginBottom: 15,
    overflow: 'hidden',
    borderRadius: 12,
    alignSelf: 'center',
    width: '95%',
  },
  sectionImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  howItWorksContainer: {
    marginBottom: 10,
  },
  messageContainer: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 5,
    textAlign: 'left',
  },
  processItem: {
    marginBottom: 9,
    paddingVertical: 2,
  },
  processText: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 19,
    fontWeight: '400',
    textAlign: 'left',
  },
  boldText: {
    fontWeight: '600',
    color: Colors.primaryColor,
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
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BannerDetailScreen;
