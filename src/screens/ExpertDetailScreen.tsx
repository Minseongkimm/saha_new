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
import { supabase } from '../utils/supabaseClient';
import { Expert } from '../types/expert';

import { getExpertImage } from '../utils/getExpertImage';

interface ExpertDetailScreenProps {
  navigation: any;
  route: any;
}

interface ExpertWithDetails extends Expert {
  expert_details: {
    message: string;
    introduction: string;
    ai_accuracy: number;
    consultation_count: number;
    satisfaction_rate: number;
  };
}

const ExpertDetailScreen: React.FC<ExpertDetailScreenProps> = ({ navigation, route }) => {
  const { expertId } = route.params;
  const [loading, setLoading] = useState(true);
  const [expert, setExpert] = useState<ExpertWithDetails | null>(null);

  useEffect(() => {
    fetchExpertDetails();
  }, []);

  const handleStartChat = async () => {
    if (!expert) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return;
    }

    try {
      // 1. 기존 채팅방 확인
      const { data: existingRoom } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('user_id', user.id)
        .eq('expert_id', expert.id)
        .single();

      let chatRoomId;

      if (existingRoom) {
        chatRoomId = existingRoom.id;
      } else {
        // 2. 새 채팅방 생성
        const { data: newRoom, error } = await supabase
          .from('chat_rooms')
          .insert({
            user_id: user.id,
            expert_id: expert.id
          })
          .select()
          .single();

        if (error) throw error;
        chatRoomId = newRoom.id;
      }

      // 3. 채팅방으로 이동
      navigation.navigate('ChatRoom', {
        roomId: chatRoomId,
        expert: expert
      });

    } catch (error) {
      console.error('Error starting chat:', error);
      Alert.alert('오류', '채팅을 시작할 수 없습니다.');
    }
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
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        showLogo={true}
      />

      <ScrollView style={styles.scrollView}>
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
          <Text style={styles.title}>{expert.name}</Text>
          <View style={styles.subtitleContainer}>
            {expert.title.split(',').map((tag: string, index: number) => (
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
            <Text style={styles.messageText}>"{expert.expert_details.message}"</Text>
          </View>

          {/* 도사님 소개 섹션 */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>👨‍🏫</Text>
              <Text style={styles.sectionTitle}>도사님 소개</Text>
            </View>
            <Text style={styles.introText}>{expert.expert_details.introduction}</Text>
          </View>

          {/* AI 정확도 및 상담 통계 섹션 */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>📊</Text>
              <Text style={styles.sectionTitle}>상담 통계</Text>
            </View>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{expert.expert_details.ai_accuracy}%</Text>
                <Text style={styles.statLabel}>AI 정확도</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{expert.expert_details.consultation_count}</Text>
                <Text style={styles.statLabel}>상담 건수</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{expert.expert_details.satisfaction_rate}</Text>
                <Text style={styles.statLabel}>만족도</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.consultButton}
            onPress={handleStartChat}
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primaryColor,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
});

export default ExpertDetailScreen;
