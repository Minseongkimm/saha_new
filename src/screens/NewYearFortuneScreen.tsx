import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Colors } from '../constants/colors';
import SectionHeader from '../components/SectionHeader';
import CustomHeader from '../components/CustomHeader';
import ChatStartBottomSheet from '../components/ChatStartBottomSheet';
import AIGuideSection from '../components/AIGuideSection';
import BottomFixedButton from '../components/BottomFixedButton';
import { startChatWithExpert } from '../utils/chatUtils';

interface NewYearFortuneScreenProps {
  navigation: any;
}

const NewYearFortuneScreen: React.FC<NewYearFortuneScreenProps> = ({ navigation }) => {
  const [showChatModal, setShowChatModal] = useState(false);

  const handleStartChat = () => {
    setShowChatModal(true);
  };

  const onStartChat = () => {
    setShowChatModal(false);
    startChatWithExpert(navigation, 'newyear_fortune');
  };

  // Mock 데이터 (실제 구현 시 useNewYearFortune 훅으로 대체)
  const mockFortuneData = {
    year: 2026,
    yearName: "병오년",
    yearDescription: "적마의 해. 열정과 도약의 기운",
    yearGanji: {
      yearGanji: "丙午",
      element: "火",
      animal: "적마"
    },
    // 전체 운세 (300자 이내)
    overall: "2026년은 당신에게 인성의 해입니다. 병오년의 적마 기운이 당신의 사주를 생조하여 배움과 성장의 시기가 됩니다. 천간의 화생토 작용으로 지식 습득과 자기계발이 강조되는 한 해입니다. 대운과의 조화로 안정적인 흐름 속에서 새로운 배움을 얻을 수 있는 시기이며 스승이나 멘토의 도움도 기대할 수 있습니다. 다만 일부 달에는 충의 영향으로 신중함이 필요하니 급하게 서두르지 말고 차근차근 나아가세요.",
    categories: {
      // 연애운 (150자)
      love: "연애운은 인성의 작용으로 진중하고 깊이 있는 만남이 기대됩니다. 가벼운 만남보다는 진지한 관계를 추구하게 될 것입니다. 5월과 8월이 좋은 인연을 만날 수 있는 시기입니다. 상대방의 내면을 중요하게 여기며 다가가면 좋은 결과가 있을 것입니다.",
      // 재물운 (150자)
      wealth: "재물운은 상승세입니다. 화의 기운으로 활발한 활동과 수입 증가가 예상됩니다. 다만 지출도 많아질 수 있으니 계획적인 관리가 필요합니다. 특히 봄철에는 재물 관리에 신경을 쓰고 여름에는 투자 기회가 올 수 있습니다. 신중한 판단으로 재물을 불려나가세요.",
      // 건강운 (150자)
      health: "건강운은 양호합니다. 화의 기운으로 활력이 넘치는 한 해가 될 것입니다. 다만 과도한 열정으로 무리하지 않도록 주의하세요. 여름철에는 심장과 혈압 관리가 필요하고 적당한 휴식이 중요합니다. 스트레스 해소를 위해 야외 활동을 추천합니다. 균형잡힌 생활로 건강을 유지하세요.",
      // 직장운 (150자)
      career: "직장운은 인성의 영향으로 배움과 성장이 강조되는 해입니다. 새로운 기술이나 자격증 취득에 도전해보세요. 상반기에는 학습 기간이고 하반기에는 그 성과가 나타날 것입니다. 상사나 선배의 조언을 잘 받아들이면 큰 도움이 됩니다. 성실함과 겸손함으로 인정받을 수 있습니다."
    },
    luckyMonths: [
      // 100-150자
      { month: 5, advice: "5월은 삼합의 좋은 기운이 작용하여 중요한 결정이나 새로운 계약을 하기에 최적의 시기입니다. 적극적으로 행동하고 새로운 도전을 시작해보세요. 협력과 동업의 기회도 찾아올 수 있으니 인맥 관리에 신경을 쓰면 좋은 성과를 얻을 수 있습니다." },
      { month: 8, advice: "8월은 매우 안정적인 흐름이 이어지는 달입니다. 화의 기운이 왕성하여 활발한 활동이 가능하며 인맥 확장과 네트워킹에 신경을 쓰면 좋은 성과를 얻을 수 있습니다. 계획했던 일을 추진하고 새로운 프로젝트를 시작하기에도 좋은 시기입니다." }
    ],
    cautiousMonths: [
      // 100-150자
      { month: 12, advice: "12월은 충의 영향으로 주의가 필요한 시기입니다. 갈등을 피하고 조화를 추구하는 것이 중요합니다. 급한 결정보다는 차분히 마무리에 집중하고 내년을 준비하는 데 시간을 할애하세요. 연말에는 무리한 계획보다 현실적인 목표를 세우는 것이 좋습니다." },
      { month: 1, advice: "1월은 연초의 불안정한 기운으로 서두르지 말고 신중하게 행동해야 합니다. 충동적인 결정은 피하고 차분히 상황을 분석하는 것이 중요합니다. 이 시기에는 계획을 세우고 준비하는 데 집중하며 2월 이후 본격적으로 움직이는 것을 추천합니다." }
    ],
    generatedAt: new Date().toISOString(),
    llmModel: "gpt-4o-mini"
  };

  const fortuneData = mockFortuneData;

  // 카테고리 색상 매핑
  const categoryConfig = {
    overall: { color: '#FF6B6B', label: '전체운' },
    love: { color: '#FF8E8E', label: '연애운' },
    wealth: { color: '#4ECDC4', label: '재물운' },
    health: { color: '#45B7D1', label: '건강운' },
    career: { color: '#96CEB4', label: '직장운' },
  };

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="신년운세"
        onBackPress={() => navigation.goBack()}
      />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          <SectionHeader 
            title={`${fortuneData.year}년 신년운세`}
            description="새해를 맞아 한 해 운세를 미리 확인해보세요"
          />

          {/* 연도 카드 */}
          <View style={styles.yearCard}>
            <Image
              source={require('../../assets/saju/newyear_saju.png')}
              style={styles.yearIcon}
            />
            <Text style={styles.yearText}>{fortuneData.year}년</Text>
            <Text style={styles.yearSubtext}>{fortuneData.yearName} {fortuneData.yearGanji.animal}띠해</Text>
            <Text style={styles.yearDescription}>{fortuneData.yearDescription}</Text>
          </View>

          {/* 전체 운세 */}
          <View style={styles.overallCard}>
            <Text style={styles.overallTitle}>한 해 전체 운세</Text>
            <Text style={styles.overallText}>{fortuneData.overall}</Text>
          </View>

          {/* 분야별 운세 */}
          <View style={styles.fortuneContainer}>
            <Text style={styles.sectionTitle}>분야별 운세</Text>
            
            {/* 연애운 */}
            <View style={styles.fortuneItem}>
              <View style={styles.fortuneContent}>
                <Text style={styles.fortuneCategory}>{categoryConfig.love.label}</Text>
                <Text style={styles.fortuneDescription}>{fortuneData.categories.love}</Text>
              </View>
            </View>

            {/* 재물운 */}
            <View style={styles.fortuneItem}>
              <View style={styles.fortuneContent}>
                <Text style={styles.fortuneCategory}>{categoryConfig.wealth.label}</Text>
                <Text style={styles.fortuneDescription}>{fortuneData.categories.wealth}</Text>
              </View>
            </View>

            {/* 건강운 */}
            <View style={styles.fortuneItem}>
              <View style={styles.fortuneContent}>
                <Text style={styles.fortuneCategory}>{categoryConfig.health.label}</Text>
                <Text style={styles.fortuneDescription}>{fortuneData.categories.health}</Text>
              </View>
            </View>

            {/* 직장운 */}
            <View style={styles.fortuneItem}>
              <View style={styles.fortuneContent}>
                <Text style={styles.fortuneCategory}>{categoryConfig.career.label}</Text>
                <Text style={styles.fortuneDescription}>{fortuneData.categories.career}</Text>
              </View>
            </View>
          </View>

          {/* 길한 달 */}
          <View style={styles.keyPointsCard}>
            <Text style={styles.keyPointsTitle}>길한 달</Text>
            {fortuneData.luckyMonths.map((item, index) => (
              <View key={index} style={styles.monthAdviceItem}>
                <Text style={styles.monthLabel}>{item.month}월</Text>
                <Text style={styles.monthAdviceText}>{item.advice}</Text>
              </View>
            ))}
          </View>

          {/* 주의할 달 */}
          <View style={styles.keyPointsCard}>
            <Text style={styles.keyPointsTitle}>주의할 달</Text>
            {fortuneData.cautiousMonths.map((item, index) => (
              <View key={index} style={styles.monthAdviceItem}>
                <Text style={styles.monthLabel}>{item.month}월</Text>
                <Text style={styles.monthAdviceText}>{item.advice}</Text>
              </View>
            ))}
          </View>

          {/* AI 가이드 섹션 */}
          <AIGuideSection
            title="더 깊이 있는 이야기가 필요하다면"
            description={`궁금한 점이나 더 자세한 해석이 필요하시다면${'\n'}AI 도사와 1:1 대화를 통해 맞춤형 조언을 받아보세요.`}
            imageSource={require('../../assets/logo/logo_icon.png')}
          />
        </View>
      </ScrollView>

      {/* 하단 고정 버튼 */}
      <BottomFixedButton
        onPress={handleStartChat}
        text="신년운세 이야기 나누기"
      />

      {/* 채팅 시작 바텀 시트 */}
      <ChatStartBottomSheet
        visible={showChatModal}
        onClose={() => setShowChatModal(false)}
        onStartChat={onStartChat}
        title="신년운세 전문가와 대화하기"
        description="신년운세에 대해 더 자세히 물어보고 싶은 것이 있나요?"
        buttonText="대화 시작하기"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 0,
  },
  yearCard: {
    backgroundColor: 'white',
    paddingHorizontal: 0,
    paddingVertical: 24,
    marginBottom: 20,
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
  overallCard: {
    backgroundColor: 'white',
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginBottom: 20,
  },
  overallTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  overallText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
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
    backgroundColor: 'white',
    paddingHorizontal: 0,
    paddingVertical: 16,
    marginBottom: 12,
  },
  fortuneContent: {
    flex: 1,
  },
  fortuneCategory: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  fortuneDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  keyPointsCard: {
    backgroundColor: 'white',
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginBottom: 20,
  },
  keyPointsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  monthAdviceItem: {
    marginBottom: 16,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primaryColor,
    marginBottom: 8,
  },
  monthAdviceText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
});

export default NewYearFortuneScreen;
