import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors } from '../constants/colors';
import CustomHeader from '../components/CustomHeader';
import ChatStartBottomSheet from '../components/ChatStartBottomSheet';
import BottomFixedButton from '../components/BottomFixedButton';
import { supabase } from '../utils/supabaseClient';
import { Expert } from '../types/expert';

import { getExpertImage } from '../utils/getExpertImage';
import { getExpertListCache } from '../utils/expertListCache';
import { startChatWithExpert } from '../utils/chatUtils';

interface ExpertDetailScreenProps {
  navigation: any;
  route: any;
}

interface Review {
  text: string;
  daysAgo: number;
  userId: string;
}

interface ConsultationCase {
  situation: string;
  result: string;
}

interface ExpertWithDetails extends Expert {
  expert_details: {
    message: string;
    introduction: string;
    ai_accuracy: number;
    consultation_count: number;
    satisfaction_rate: number;
    recent_reviews?: Review[];
    monthly_topics?: string[];
    consultation_cases?: ConsultationCase[];
  };
}

const ExpertDetailScreen: React.FC<ExpertDetailScreenProps> = ({ navigation, route }) => {
  const { expertId } = route.params;
  const [loading, setLoading] = useState(true);
  const [expert, setExpert] = useState<ExpertWithDetails | null>(null);
  const [showChatBottomSheet, setShowChatBottomSheet] = useState(false);

  useEffect(() => {
    const cached = getExpertListCache();
    if (cached) {
      const found = cached.find((e) => e.id === expertId);
      if (found && (found as any).expert_details) {
        // 캐시에 expert_details가 있으면 DB 조회 없이 바로 사용
        setExpert(found as ExpertWithDetails);
        setLoading(false);
        return;
      }
    }
    // 캐시가 없거나 expert_details가 없으면 DB 조회
    fetchExpertDetails();
  }, []);

  const handleStartChat = () => {
    if (!expert) return;
    setShowChatBottomSheet(true);
  };

  const handleConfirmChat = async () => {
    if (!expert) return;
    setShowChatBottomSheet(false);
    await startChatWithExpert(navigation, expert.id);
  };

  const fetchExpertDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('experts')
        .select(`
          *,
          expert_details(*)
        `)
        .eq('id', expertId)
        .single();

      if (error) throw error;
      
      // DB에서 가져온 데이터를 그대로 사용
      setExpert(data);
    } catch (error) {
      console.error('Error fetching expert details:', error);
      Alert.alert('오류', '전문가 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !expert) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={Colors.primaryColor} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 커스텀 헤더 */}
      <CustomHeader
        title="전문가 상세"
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* 도사 이미지 */}
        <View style={styles.expertImageContainer}>
          <Image 
            source={getExpertImage(expert.image_name)}
            style={styles.expertImage} 
            resizeMode="cover" 
          />
        </View>

        {/* 도사 정보 */}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{expert.name}</Text>
            {expert.signature_phrase && (
              <Text style={styles.hashtagText}>
                {expert.signature_phrase.split('·').map(phrase => `#${phrase.trim().replace(/\s/g, '')}`).join(' ')}
              </Text>
            )}
          </View>
          
          {expert.specialty_tags && expert.specialty_tags.length > 0 && (
            <View style={styles.specialtyTagsContainer}>
              {expert.specialty_tags.map((tag: string, index: number) => (
                <View key={`specialty-${index}`} style={styles.specialtyTag}>
                  <Text style={styles.specialtyTagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 도사님 한마디 섹션 */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>도사님 한마디</Text>
            </View>
            <View style={styles.quoteBorder}>
              <Text style={styles.quoteBorderText}>
                {expert.expert_details.message.split('.').filter(s => s.trim()).map(sentence => sentence.trim() + '.').join('\n')}
              </Text>
            </View>
          </View>

          {/* 도사님 소개 섹션 */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>도사님 소개</Text>
            </View>
            <Text style={styles.introText}>{expert.expert_details.introduction}</Text>
          </View>

          {/* 7. 이달의 상담 주제 */}
          {expert.expert_details.monthly_topics && expert.expert_details.monthly_topics.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>이달의 주요 상담 주제</Text>
              </View>
              <View style={styles.topicsContainer}>
                {expert.expert_details.monthly_topics.map((topic, index) => (
                  <View key={index} style={styles.topicItem}>
                    <Text style={styles.topicBullet}>•</Text>
                    <Text style={styles.topicText}>{topic}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 실제 상담 사례 */}
          {expert.expert_details.consultation_cases && expert.expert_details.consultation_cases.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>이런 분들이 찾아오십니다</Text>
              </View>
              {expert.expert_details.consultation_cases.map((consultCase, index) => (
                <View key={index} style={styles.caseItem}>
                  <Text style={styles.caseLabel}>상황</Text>
                  <Text style={styles.caseText}>{consultCase.situation}</Text>
                  <Text style={styles.caseLabel}>상담 후</Text>
                  <Text style={styles.caseResultText}>{consultCase.result}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 5. 최근 리뷰 */}
          {expert.expert_details.recent_reviews && expert.expert_details.recent_reviews.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>최근 상담 후기</Text>
              </View>
              {expert.expert_details.recent_reviews.map((review, index) => (
                <View key={index} style={styles.reviewItem}>
                  <Text style={styles.reviewText}>{review.text}</Text>
                  <View style={styles.reviewFooter}>
                    <Text style={styles.reviewUserId}>{review.userId}</Text>
                    <Text style={styles.reviewDate}>{review.daysAgo}일 전</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

        </View>
      </ScrollView>

      {/* 하단 고정 버튼 */}
      <BottomFixedButton
        onPress={handleStartChat}
        text="이야기 나누기"
      />

      {/* 채팅 시작 바텀시트 */}
      <ChatStartBottomSheet
        visible={showChatBottomSheet}
        onClose={() => setShowChatBottomSheet(false)}
        onStartChat={handleConfirmChat}
        title={`${expert?.name}님과 이야기 나누기`}
        description="더 자세한 해석이 필요하시다면&#10;AI 도사와 1:1 대화를 통해 맞춤형 조언을 받아보세요."
        buttonText="채팅 시작하기"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // 하단 고정 버튼 공간 확보
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  hashtagText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.primaryColor,
    letterSpacing: -0.2,
  },
  specialtyTagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  specialtyTag: {
    backgroundColor: Colors.primaryColor + '0D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 6,
    marginBottom: 4,
    borderWidth: 0.3,
    borderColor: Colors.primaryColor + '30',
  },
  specialtyTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.primaryColor,
    letterSpacing: -0.2,
  },
  quoteBorder: {
    borderWidth: 0.5,
    borderColor: Colors.primaryColor + '20',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: Colors.primaryColor + '08',
    shadowColor: Colors.primaryColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  quoteBorderText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#555',
    lineHeight: 24,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  messageText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 22,
    textAlign: 'left',
  },
  sectionContainer: {
    paddingTop: 10,
    paddingBottom: 24,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  introText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 24,
  },
  topicsContainer: {
    gap: 10,
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  topicBullet: {
    fontSize: 14,
    color: Colors.primaryColor,
    marginRight: 8,
    fontWeight: 'bold',
  },
  topicText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  reviewItem: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  reviewText: {
    fontSize: 13,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewUserId: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  reviewDate: {
    fontSize: 11,
    color: '#999',
  },
  caseItem: {
    backgroundColor: '#F8F9FA',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  caseLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    marginBottom: 4,
    marginTop: 8,
  },
  caseText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 20,
    marginBottom: 4,
  },
  caseResultText: {
    fontSize: 13,
    color: Colors.primaryColor,
    lineHeight: 20,
    fontWeight: '500',
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


});

export default ExpertDetailScreen;
