import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '../../constants/colors';
import CustomHeader from '../../components/common/CustomHeader';
import { renderHighlight } from '../../utils/text/textFormatUtils';

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
            source={require('../../../assets/guide/saha_world.jpg')}
            style={styles.worldImage}
            resizeMode="cover"
          />
        </View>

        {/* 콘텐츠 */}
        <View style={styles.content}>
        <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>사바세계란?</Text>
            
            <View style={styles.processItem}>
              <Text style={styles.processText}>
                사바세계는{renderHighlight(' 괴로움도 기쁨도 함께 품은 세상')}이란 뜻이에요.
              </Text>
              <Text style={styles.processText}>
                이곳에서 사바는 당신이 스스로를 이해하도록 돕는{renderHighlight(' 길을 비춰주는 작은 등불')}입니다.
              </Text>
            </View>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>사바는 이렇게 작동합니다</Text>
            
            <View style={styles.processItem}>
              <Text style={styles.processText}>
                명리학의 지혜와 AI의 통찰이 만나 당신의 사주 데이터를 기반으로 성향, 흐름, 인생의 방향을 함께 읽어드립니다.
              </Text>
              <Text style={styles.processText}>
                 사바가 전하고 싶은 건 단순한 결과가 아니라{renderHighlight(' 당신 자신을 이해하는 과정')}이에요.
              </Text>
            </View>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>사바가 해결하고 싶은 것</Text>
            
            <View style={styles.processItem}>
              <Text style={styles.processText}>
                기존의 오프라인 상담은 비싸고 묻기 어렵고 시간에 묶여 있었어요.
              </Text>
              <Text style={styles.processText}>
                평균 5~7개 질문으로 끝나던 대화, 편하게 물어볼 수 없는 분위기
              </Text>
              <Text style={styles.processText}>
                 이제는 다릅니다. 사바에게는 시간, 질문 개수 제한이 없습니다.
              </Text>
              <Text style={styles.processText}>
                 당신이 원할 때 새벽이든 낮이든{renderHighlight(' 그저 말을 걸면 됩니다')}.
              </Text>
            </View>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>사바가 전하고 싶은 것</Text>
            <View style={styles.processItem}>
              <Text style={styles.processText}>
                사바는 당신이 어떤 사람인지 지금 어떤 흐름 속에 있는지를 알려주는{renderHighlight(' 운명의 지도')}입니다.
              </Text>
              <Text style={styles.processText}>
                우리는 예언하지 않습니다. 대신 {renderHighlight('이해하고 활용하는 법')}을 함께 찾습니다.
                그것이 {renderHighlight('진짜 운명 사용법')}이니까요.
              </Text>
            </View>  
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>사바 활용법</Text>
              <View style={styles.processItem}>
                <Text style={styles.processText}>
                  1. 연애 일 인생 중 {renderHighlight('궁금한 주제의 도사를 선택')}하세요.
                </Text>
                <Text style={styles.processText}>
                  2. {renderHighlight('나를 알아가는 과정')}에서 궁금한 부분을 디테일하게 물어보세요.
                </Text>
                <Text style={styles.processText}>
                  3. AI 도사가 당신의{renderHighlight(' 사주 흐름을 함께 읽고 방향을 제안')}합니다.
                </Text>
                <Text style={styles.processText}>
                  4. {renderHighlight('당신의 삶이 조금 더 명확해지는 순간')} 사바는 그곳에 있습니다.
                </Text>
              </View>
          </View>

          <View style={styles.sectionImageContainer}>
              <Image
                source={require('../../../assets/guide/conversation_example.png')}
              style={styles.sectionImage}
              resizeMode="cover"
            />
        </View>

          <TouchableOpacity style={styles.startButton} onPress={handleStart}>
            <Text style={styles.startButtonText}>나의 운명지도 열기</Text>
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
    width: '100%',
    height: 200,
    marginTop: 0,
    overflow: 'hidden',
  },
  worldImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
  sectionContainer: {
    marginBottom: 13,
  },
  sectionTitle: {
    fontSize: 17,
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
    lineHeight: 21,
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
