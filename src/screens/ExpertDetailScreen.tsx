import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '../constants/colors';
import CustomHeader from '../components/CustomHeader';

interface ExpertDetailScreenProps {
  navigation: any;
  route: any;
}

const ExpertDetailScreen: React.FC<ExpertDetailScreenProps> = ({ navigation, route }) => {
  const { expert } = route.params;

  return (
    <View style={styles.container}>
      {/* 커스텀 헤더 */}
      <CustomHeader
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        showLogo={true}
      />

      <ScrollView style={styles.scrollView}>
        {/* 도사 이미지 */}
        <View style={styles.expertImageContainer}>
          <Image source={expert.image} style={styles.expertImage} resizeMode="cover" />
        </View>

        {/* 도사 정보 */}
        <View style={styles.content}>
          <Text style={styles.title}>{expert.title}</Text>
          <View style={styles.subtitleContainer}>
            {expert.subtitle.split(',').map((tag: string, index: number) => (
              <View key={index} style={styles.tagItem}>
                <Text style={styles.subtitle}>{tag.trim()}</Text>
              </View>
            ))}
          </View>
          
          {/* 도사님 한마디 섹션 */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>💬</Text>
              <Text style={styles.sectionTitle}>도사님 한마디</Text>
            </View>
            <Text style={styles.messageText}>“사는 곳이 곧 운명입니다. 집터 하나가 삶의 기운을 바꾼다는 걸 사주를 통해 보여드리지요.”</Text>
          </View>

          {/* 도사님 소개 섹션 */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>👨‍🏫</Text>
              <Text style={styles.sectionTitle}>도사님 소개</Text>
            </View>
            <Text style={styles.introText}>
              경북 산골에서 태어나 어린 시절부터 산천의 기운을 짚었다는 집안 내력이 이어진다. 나침반과 옛 지도를 들고 터를 살피던 그의 모습은 지금도 마을 어른들 사이에 전해진다.{'\n\n'}후시도령은 사람의 사주와 땅의 맥을 함께 맞춰보며 어디에 뿌리내려야 복이 드는지를 가르쳐준다. 허황된 말은 하지 않고 오직 현실적으로 도움이 되는 집터를 짚어내는 것으로 유명하다.
            </Text>
          </View>

          {/* 대화예시 섹션 (이미지 준비중) */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>💭</Text>
              <Text style={styles.sectionTitle}>대화예시</Text>
            </View>
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderText}>이미지 준비중...</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.consultButton}
            onPress={() => navigation.navigate('ChatRoom', { expert })}
          >
            <Text style={styles.consultButtonText}>이야기 나누기</Text>
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
  expertImageContainer: {
    height: 370,
    margin: 10,
    borderRadius: 15,
    overflow: 'hidden',
  },
  expertImage: {
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
    textAlign: 'left',
    marginBottom: 10,
  },
  subtitleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tagItem: {
    backgroundColor: Colors.primaryColor,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  subtitle: {
    fontSize: 14,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },


  messageText: {
    fontSize: 16,
    color: '#000',
    lineHeight: 24,
    textAlign: 'left',
  },
  sectionContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    fontSize: 24,
    marginRight: 7,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  introText: {
    fontSize: 16,
    color: '#000',
    lineHeight: 24,
    textAlign: 'left',
  },
  placeholderContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 16,
    color: '#6c757d',
    fontStyle: 'italic',
  },


  consultButton: {
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: Colors.primaryColor,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 20,
    alignItems: 'center',
  },
  consultButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default ExpertDetailScreen;
