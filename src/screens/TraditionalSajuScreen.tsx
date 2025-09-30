import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../constants/colors';
import SectionHeader from '../components/SectionHeader';
import CustomHeader from '../components/CustomHeader';
import SajuChart from '../components/SajuChart';
import SajuAnalysis from '../components/SajuAnalysis';
import ChatStartBottomSheet from '../components/ChatStartBottomSheet';
import AIGuideSection from '../components/AIGuideSection';
import BottomFixedButton from '../components/BottomFixedButton';
import { startChatWithExpert } from '../utils/chatUtils';
import { useTraditionalSaju } from '../hooks/useTraditionalSaju';


interface TraditionalSajuScreenProps {
  navigation: any;
}

const TraditionalSajuScreen: React.FC<TraditionalSajuScreenProps> = ({ navigation }) => {
  const [showChatModal, setShowChatModal] = useState(false);
  
  // 커스텀 훅으로 모든 로직 처리
  const {
    sajuData,
    sajuLoading,
    analysisData,
    streamingData,
    finalData,
    isStreaming,
  } = useTraditionalSaju();

  // 스트리밍 데이터 렌더링 함수
  const renderStreamingAnalysis = (data: any) => (
    <View style={styles.analysisContentContainer}>
      {data.overall && (
        <View style={styles.analysisSection}>
          <Text style={styles.analysisSectionTitle}>전체 운세</Text>
          <Text style={styles.analysisSectionText}>{data.overall}</Text>
        </View>
      )}
      
      {data.dayStem && (
        <View style={styles.analysisSection}>
          <Text style={styles.analysisSectionTitle}>일간 분석</Text>
          <Text style={styles.analysisSectionText}>{data.dayStem}</Text>
        </View>
      )}
      
      {data.fiveElements && (
        <View style={styles.analysisSection}>
          <Text style={styles.analysisSectionTitle}>오행 분석</Text>
          <Text style={styles.analysisSectionText}>{data.fiveElements}</Text>
        </View>
      )}
      
      {data.sasin && (
        <View style={styles.analysisSection}>
          <Text style={styles.analysisSectionTitle}>십이신살</Text>
          <Text style={styles.analysisSectionText}>{data.sasin}</Text>
        </View>
      )}
      
      {data.sinsal && (
        <View style={styles.analysisSection}>
          <Text style={styles.analysisSectionTitle}>신살 분석</Text>
          <Text style={styles.analysisSectionText}>{data.sinsal}</Text>
        </View>
      )}
      
      {data.comprehensiveAdvice && (
        <View style={styles.analysisSection}>
          <Text style={styles.analysisSectionTitle}>종합 조언</Text>
          <Text style={styles.analysisSectionText}>{data.comprehensiveAdvice}</Text>
        </View>
      )}
    </View>
  );

  // === 로딩 UI ===
  
  // 1단계: 사주 데이터 로딩
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
            
            {/* 스트리밍 중 */}
            {isStreaming && streamingData && renderStreamingAnalysis(streamingData)}
            
            {/* 캐시/DB 데이터 또는 최종 데이터 표시 */}
            {!isStreaming && (analysisData || finalData) && (
              <View style={styles.analysisContentContainer}>
                <SajuAnalysis analysis={(analysisData || finalData)!} />
                
                <AIGuideSection
                  title="더 깊이 있는 이야기가 필요하다면"
                  description={`궁금한 점이나 더 자세한 해석이 필요하시다면${'\n'}AI 도사와 1:1 대화를 통해 맞춤형 조언을 받아보세요.`}
                  imageSource={require('../../assets/logo/logo_icon.png')}
                />
              </View>
            )}

            {/* 로딩 중 (데이터가 하나도 없을 때만) */}
            {!isStreaming && !analysisData && !finalData && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primaryColor} />
                <Text style={styles.loadingText}>사주 해석을 확인하는 중...</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
      
      {/* 하단 고정 버튼 */}
      <BottomFixedButton
        onPress={() => setShowChatModal(true)}
        text="AI 도사와 이야기 나누기"
      />
      
      {/* 채팅 시작 바텀 시트 */}
      <ChatStartBottomSheet
        visible={showChatModal}
        onClose={() => setShowChatModal(false)}
        onStartChat={() => {
          setShowChatModal(false);
          startChatWithExpert(navigation, 'traditional_saju');
        }}
        title="AI 사주 전문가와 이야기하기"
        description="당신의 사주를 기반으로 AI가 인생의 실마리를 드립니다."
        buttonText="시작하기"
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
});

export default TraditionalSajuScreen;