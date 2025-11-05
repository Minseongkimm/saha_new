import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors } from '../../constants/colors';
import SectionHeader from '../../components/common/SectionHeader';
import CustomHeader from '../../components/common/CustomHeader';
import SajuChart from '../../components/saju/SajuChart';
import SajuAnalysis from '../../components/saju/SajuAnalysis';
import ChatStartBottomSheet from '../../components/bottomsheets/ChatStartBottomSheet';
import AIGuideSection from '../../components/common/AIGuideSection';
import BottomFixedButton from '../../components/common/BottomFixedButton';
import { startChatWithExpert, getExpertByCategory } from '../../utils/chat/chatUtils';
import { useTraditionalSaju } from '../../hooks/useTraditionalSaju';


interface TraditionalSajuScreenProps {
  navigation: any;
}

const TraditionalSajuScreen: React.FC<TraditionalSajuScreenProps> = ({ navigation }) => {
  const [showChatModal, setShowChatModal] = useState(false);
  const [expertName, setExpertName] = useState<string>('');
  
  // 커스텀 훅으로 모든 로직 처리
  const {
    sajuData,
    sajuLoading,
    sajuInitializing,
    analysisData,
    streamingText,
    isStreaming,
    streamingError,
  } = useTraditionalSaju();

  // 실시간 스트리밍 텍스트를 섹션별로 파싱하여 렌더링
  const renderStreamingText = (text: string) => {
    // 실시간으로 섹션 추출
    const extractSection = (sectionTitle: string): string => {
      const patterns = [
        new RegExp(`###\\s*\\d*\\.?\\s*${sectionTitle}[\\s\\S]*?(?=###|$)`),
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          let content = match[0];
          content = content.replace(new RegExp(`###\\s*\\d*\\.?\\s*${sectionTitle}`, 'g'), '');
          return content.trim();
        }
      }
      return '';
    };

    const streamingData = {
      overall: extractSection('전체적인 풀이'),
      dayStem: extractSection('일간 풀이'),
      fiveElements: extractSection('오행 균형'),
      sasin: extractSection('십성 구조'),
      sinsal: extractSection('신살 해석'),
      comprehensiveAdvice: extractSection('종합 조언'),
      generatedAt: '',
      llmModel: '',
    };

    return (
      <View style={styles.analysisContentContainer}>
        <View style={styles.streamingIndicatorContainer}>
          <Text style={styles.streamingIndicator}>✨ AI가 분석하는 중...</Text>
        </View>
        <SajuAnalysis analysis={streamingData} />
      </View>
    );
  };

  // === 로딩 UI ===
  
  // 0단계: 초기화 중 (캐시 확인 중)
  if (sajuInitializing) {
    return (
      <View style={styles.container}>
        <CustomHeader 
          title="정통사주"
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.centerContainer}>
          {/* 캐시 확인 중에는 빈 화면 (깜빡임 방지) */}
        </View>
      </View>
    );
  }
  
  // 1단계: 사주 데이터 로딩 (DB 조회 중)
  if (sajuLoading) {
  return (
    <View style={styles.container}>
      <CustomHeader 
        title="정통사주"
        onBackPress={() => navigation.goBack()}
      />
        <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={Colors.primaryColor} />
              <Text style={styles.loadingText}>만세력 표를 불러오는 중...</Text>
            </View>
      </View>
    );
  }

  // 2단계: 사주 데이터 없음
  if (!sajuData) {
    return (
      <View style={styles.container}>
        <CustomHeader 
          title="정통사주"
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.centerContainer}>
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
      </View>
    );
  }

  // 3단계: 사주 데이터 있음 - 만세력 표 + 해석
  return (
    <View style={styles.container}>
      <CustomHeader 
        title="정통사주"
        onBackPress={() => navigation.goBack()}
      />
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          {/* 만세력 표는 항상 표시 */}
          <SectionHeader 
            title="정통 사주팔자" 
            description="전통 사주학으로 당신의 운명을 깊이 있게 분석합니다"
          />
          <SajuChart sajuData={sajuData} />

          {/* 사주 해석 섹션 */}
          <View style={styles.analysisSection}>
            <SectionHeader 
              title="사주 해석" 
              description="인공지능이 당신의 사주를 깊이 있게 분석해드립니다"
            />
            
            {/* 실시간 스트리밍 중 */}
            {isStreaming && streamingText && renderStreamingText(streamingText)}
            
            {/* 캐시/DB 데이터 표시 */}
            {!isStreaming && analysisData && (
              <View style={styles.analysisContentContainer}>
                <SajuAnalysis analysis={analysisData} />
                
                <AIGuideSection
                  title="더 깊이 있는 이야기가 필요하다면"
                  description={`궁금한 점이나 더 자세한 해석이 필요하시다면${'\n'}AI 도사와 1:1 대화를 통해 맞춤형 조언을 받아보세요.`}
                  imageSource={require('../../../assets/logo/logo_icon.png')}
                />
              </View>
            )}

            {/* 로딩 중 (데이터가 하나도 없을 때만) */}
            {!isStreaming && !analysisData && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primaryColor} />
                <Text style={styles.loadingText}>사주 해석을 확인하는 중...</Text>
              </View>
            )}
            
            {/* 에러 표시 */}
            {streamingError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>⚠️ {streamingError.message}</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
      
      {/* 하단 고정 버튼 */}
      <BottomFixedButton
        onPress={async () => {
          const expert = await getExpertByCategory('traditional_saju');
          
          if (expert) {
            setExpertName(expert.name);
            setShowChatModal(true);
          } else {
            Alert.alert('오류', '전문가를 찾을 수 없습니다.');
          }
        }}
        text="AI 도사와 이야기 나누기"
      />
      
      {/* 채팅 시작 바텀 시트 */}
      <ChatStartBottomSheet
        visible={showChatModal}
        onClose={() => setShowChatModal(false)}
        onStartChat={async () => {
          setShowChatModal(false);
          
          const expert = await getExpertByCategory('traditional_saju');
          if (expert?.id) {
            startChatWithExpert(navigation, expert.id);
          } else {
            Alert.alert('오류', '전문가를 찾을 수 없습니다.');
          }
        }}
        title={`${expertName}님과 대화하기`}
        description={`궁금한 점이나 더 자세한 해석이 필요하시다면${'\n'}AI 도사와 대화해보세요.`}
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
    paddingBottom: 80,
  },
  content: {
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    minHeight: 500,
  },
  loadingContainer: {
    backgroundColor: '#fefefe',
    borderRadius: 16,
    padding: 40,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: '#f5f5f5',
    shadowColor: Colors.primaryColor,
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 0.5,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
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
  analysisSection: {
    marginTop: 0,
  },
  analysisContentContainer: {
    marginTop: 15,
  },
  analysisSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primaryColor,
    marginTop: 16,
    marginBottom: 8,
  },
  analysisSectionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  streamingIndicatorContainer: {
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  streamingIndicator: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primaryColor,
  },
  errorContainer: {
    backgroundColor: '#fee',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#c33',
    textAlign: 'center',
  },
});

export default TraditionalSajuScreen;