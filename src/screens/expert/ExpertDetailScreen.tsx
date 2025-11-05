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
  Modal,
} from 'react-native';
import { Colors } from '../../constants/colors';
import CustomHeader from '../../components/common/CustomHeader';
import ChatStartBottomSheet from '../../components/bottomsheets/ChatStartBottomSheet';
import BottomFixedButton from '../../components/common/BottomFixedButton';
import { supabase } from '../../utils/database/supabaseClient';
import { Expert } from '../../types/expert';

import { getExpertImage } from '../../utils/expert/getExpertImage';
import { getExpertListCache } from '../../utils/expert/expertListCache';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { startChatWithExpert } from '../../utils/chat/chatUtils';
import BirthInputForm, { PartnerBirthInfo } from '../../components/forms/BirthInputForm';
import { RelationshipStatus, RELATIONSHIP_STATUS_LABELS } from '../../types/partner';
import { getPartnerList, deletePartnerFromDatabase } from '../../utils/partner/partnerDatabase';
import { getPartnerListCache, isPartnerListFresh } from '../../utils/partner/partnerListCache';

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
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [showPartnerSelection, setShowPartnerSelection] = useState(false);
  const [existingPartners, setExistingPartners] = useState<any[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedPartners, setSelectedPartners] = useState<Set<string>>(new Set());
  const [partnerInfo, setPartnerInfo] = useState<PartnerBirthInfo>({
    name: '',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    birthHour: '',
    birthMinute: '',
    gender: '',
    calendarType: 'solar',
    isLeapMonth: false,
    isTimeUnknown: false,
    relationshipStatus: 'interested',
  });

  useEffect(() => {
    (async () => {
      // 1) 로컬 디테일 캐시(7일 TTL) 우선 사용
      const cacheKey = `expert_detail_${expertId}_v1`;
      try {
        const raw = await AsyncStorage.getItem(cacheKey);
        if (raw) {
          const parsed = JSON.parse(raw) as { value: ExpertWithDetails; expiresAt: number };
          if (parsed.expiresAt > Date.now()) {
            setExpert(parsed.value);
            setLoading(false);
            // SWR: 백그라운드 최신화
            void fetchExpertDetails(true);
            return;
          }
        }
      } catch {}

      // 2) 리스트 캐시에 details가 포함되었는지 확인
      const cached = getExpertListCache();
      if (cached) {
        const found = cached.find((e) => e.id === expertId);
        if (found && (found as any).expert_details) {
          setExpert(found as ExpertWithDetails);
          setLoading(false);
          // SWR
          void fetchExpertDetails(true);
          return;
        }
      }
      // 3) DB 조회
      fetchExpertDetails(false);
    })();
  }, []);

  const handleStartChat = () => {
    if (!expert) return;
    setShowChatBottomSheet(true);
  };

  const handleConfirmChat = async () => {
    if (!expert) return;
    setShowChatBottomSheet(false);
    
    // 연애 도사인 경우 상대방 정보 선택 또는 입력
    if (expert.category === 'love') {
      // 기존 상대방 정보가 있는지 확인
      const partners = await loadExistingPartners();
      if (partners.length > 0) {
        setShowPartnerSelection(true);
      } else {
        navigation.navigate('PartnerInput', { expertId: expert.id });
      }
    } else {
      await startChatWithExpert(navigation, expert.id);
    }
  };

  const loadExistingPartners = async (): Promise<any[]> => {
    try {
      // 먼저 캐시에서 확인
      const isFresh = isPartnerListFresh();
      
      if (isFresh) {
        const cached = getPartnerListCache();
        
        if (cached && cached.length > 0) {
          setExistingPartners(cached);
          return cached;
        }
      }

      // 캐시가 없거나 오래된 경우에만 DB에서 조회
      const partners = await getPartnerList();
      setExistingPartners(partners);
      return partners;
    } catch (error) {
      console.error('❌ 기존 상대방 정보 불러오기 오류:', error);
      return [];
    }
  };

  const handleSelectExistingPartner = async (partner: any) => {
    setShowPartnerSelection(false);
    // 기존 상대방 정보로 채팅 시작
    const partnerData = {
      partnerInfo: partner.birth_info,
      partnerSajuData: partner.saju_data,
      partnerId: partner.id,
      compatibilityResult: partner.compatibility_result
    };
    if (expert?.id) {
      await startChatWithExpert(navigation, expert.id, partnerData);
    }
  };

  const handleAddNewPartner = () => {
    setShowPartnerSelection(false);
    if (expert?.id) {
      navigation.navigate('PartnerInput', { expertId: expert.id });
    }
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    if (isEditMode) {
      // 편집 모드 종료 시 선택된 항목들 삭제
      if (selectedPartners.size > 0) {
        handleDeleteSelectedPartners();
      }
      setSelectedPartners(new Set());
    }
  };

  const togglePartnerSelection = (partnerId: string) => {
    setSelectedPartners(prev => {
      const newSet = new Set(prev);
      if (newSet.has(partnerId)) {
        newSet.delete(partnerId);
      } else {
        newSet.add(partnerId);
      }
      return newSet;
    });
  };

  const handleDeleteSelectedPartners = async () => {
    if (selectedPartners.size === 0) return;

    const selectedNames = existingPartners
      .filter(partner => selectedPartners.has(partner.id))
      .map(partner => partner.partner_name);

    Alert.alert(
      '상대방 정보 삭제',
      `선택된 ${selectedNames.length}명의 정보를 삭제하시겠습니까?\n${selectedNames.join(', ')}`,
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              // 선택된 모든 상대방 삭제
              for (const partnerId of selectedPartners) {
                await deletePartnerFromDatabase(partnerId);
              }
              // 목록에서 제거
              setExistingPartners(prev => 
                prev.filter(partner => !selectedPartners.has(partner.id))
              );
              setSelectedPartners(new Set());
              Alert.alert('삭제 완료', '선택된 상대방 정보가 삭제되었습니다.');
            } catch (error) {
              console.error('상대방 정보 삭제 오류:', error);
              Alert.alert('오류', '상대방 정보 삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  const handleDeletePartner = async (partnerId: string, partnerName: string) => {
    Alert.alert(
      '상대방 정보 삭제',
      `${partnerName}님의 정보를 삭제하시겠습니까?`,
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePartnerFromDatabase(partnerId);
              // 목록에서 제거
              setExistingPartners(prev => prev.filter(partner => partner.id !== partnerId));
              Alert.alert('삭제 완료', '상대방 정보가 삭제되었습니다.');
            } catch (error) {
              console.error('상대방 정보 삭제 오류:', error);
              Alert.alert('오류', '상대방 정보 삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  const handlePartnerInfoSave = async () => {
    // TODO: 상대방 정보 저장 로직 구현
    console.log('상대방 정보 저장:', partnerInfo);
    setShowPartnerModal(false);
    // 저장 후 채팅 시작
    if (expert?.id) {
      await startChatWithExpert(navigation, expert.id);
    }
  };

  const handlePartnerInfoCancel = () => {
    setShowPartnerModal(false);
  };

  const fetchExpertDetails = async (swr: boolean) => {
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
      
      // DB에서 가져온 데이터를 그대로 사용 + 디테일 캐시(7일)
      setExpert(data);
      try {
        const cacheKey = `expert_detail_${expertId}_v1`;
        const TTL_7D = 7 * 24 * 60 * 60 * 1000;
        await AsyncStorage.setItem(cacheKey, JSON.stringify({ value: data, expiresAt: Date.now() + TTL_7D }));
      } catch {}
    } catch (error) {
      console.error('Error fetching expert details:', error);
      Alert.alert('오류', '전문가 정보를 불러오는데 실패했습니다.');
    } finally {
      if (!swr) setLoading(false);
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
        title={`${expert?.name}님과 대화하기`}
        description={`궁금한 점이나 더 자세한 해석이 필요하시다면${'\n'}AI 도사와 대화해보세요.`}
        buttonText="대화 시작하기"
        isLoveExpert={expert?.category === 'love'}
        onPartnerAnalysis={async () => {
          setShowChatBottomSheet(false);
          // 기존 상대방 정보가 있는지 확인
          const partners = await loadExistingPartners();
          if (partners.length > 0) {
            setShowPartnerSelection(true);
          } else {
            if (expert?.id) {
              navigation.navigate('PartnerInput', { expertId: expert.id });
            }
          }
        }}
        onPersonalFortune={() => {
          setShowChatBottomSheet(false);
          if (expert?.id) {
            startChatWithExpert(navigation, expert.id);
          }
        }}
      />

      {/* 상대방 정보 입력 모달 (연애 도사용) */}
      <Modal
        visible={showPartnerModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
            <BirthInputForm
              birthInfo={partnerInfo}
              setBirthInfo={setPartnerInfo}
              title="상대방 정보 입력"
              showName={true}
              showRelationship={true}
              isModal={true}
            />
          </ScrollView>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={handlePartnerInfoCancel}
            >
              <Text style={styles.modalCancelButtonText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handlePartnerInfoSave}
            >
              <Text style={styles.modalSaveButtonText}>저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 기존 상대방 정보 선택 모달 */}
      <Modal
        visible={showPartnerSelection}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <CustomHeader
            title="상대방 선택"
            onBackPress={() => {
              setShowPartnerSelection(false);
              setIsEditMode(false);
              setSelectedPartners(new Set());
            }}
            rightComponent={
              <TouchableOpacity onPress={toggleEditMode}>
                <Text style={styles.editButtonText}>
                  {isEditMode ? (selectedPartners.size > 0 ? `삭제(${selectedPartners.size})` : '완료') : '편집'}
                </Text>
              </TouchableOpacity>
            }
          />
          <ScrollView style={styles.modalScrollView}>
            <View style={styles.partnerSelectionContainer}>
              <Text style={styles.partnerSelectionTitle}>기존 상대방 정보</Text>
              <Text style={styles.partnerSelectionSubtitle}>
                저장된 상대방 정보를 선택하거나 새로 입력하세요
              </Text>
              
              {existingPartners.map((partner, index) => {
                const isSelected = selectedPartners.has(partner.id);
                return (
                  <TouchableOpacity
                    key={partner.id}
                    style={[
                      styles.partnerItem,
                      isEditMode && isSelected && styles.partnerItemSelected
                    ]}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (isEditMode) {
                        togglePartnerSelection(partner.id);
                      } else {
                        handleSelectExistingPartner(partner);
                      }
                    }}
                  >
                    {isEditMode && (
                      <View style={styles.checkboxContainer}>
                        <View style={[
                          styles.checkbox,
                          isSelected && styles.checkboxSelected
                        ]}>
                          {isSelected && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                      </View>
                    )}
                    
                    <View style={styles.partnerInfo}>
                      <Text style={[
                        styles.partnerName,
                        isEditMode && isSelected && styles.partnerNameSelected
                      ]}>
                        {partner.partner_name}
                      </Text>
                      <Text style={[
                        styles.partnerStatus,
                        isEditMode && isSelected && styles.partnerStatusSelected
                      ]}>
                        {RELATIONSHIP_STATUS_LABELS[partner.relationship_status as RelationshipStatus]}
                      </Text>
                      <Text style={[
                        styles.partnerDate,
                        isEditMode && isSelected && styles.partnerDateSelected
                      ]}>
                        {new Date(partner.created_at).toLocaleDateString('ko-KR')} 저장
                      </Text>
                    </View>
                    
                    {!isEditMode && <Text style={styles.partnerArrow}>→</Text>}
                  </TouchableOpacity>
                );
              })}
              
              <TouchableOpacity
                style={styles.addNewPartnerButton}
                onPress={handleAddNewPartner}
              >
                <Text style={styles.addNewPartnerText}>+ 새로운 상대방 정보 입력</Text>
              </TouchableOpacity>
              
              <Text style={styles.swipeDeleteHint}>
                * 편집 버튼을 눌러 상대방 정보를 삭제할 수 있습니다
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
    elevation: 0.3,
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
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalScrollView: {
    flex: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: Colors.primaryColor,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  // 상대방 선택 모달 스타일
  partnerSelectionContainer: {
    padding: 20,
  },
  partnerSelectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  partnerSelectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
  },
  partnerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  partnerStatus: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  partnerDate: {
    fontSize: 12,
    color: '#999',
  },
  partnerArrow: {
    fontSize: 18,
    color: '#666',
    marginLeft: 12,
  },
  addNewPartnerButton: {
    backgroundColor: Colors.primaryColor,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  addNewPartnerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // 스와이프 삭제 관련 스타일
  swipeDeleteHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  deleteAction: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
    backgroundColor: '#ff4444',
    borderRadius: 12,
    marginBottom: 12,
  },
  deleteButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    minWidth: 80,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // 편집 모드 관련 스타일
  editButtonText: {
    color: Colors.primaryColor,
    fontSize: 14,
    fontWeight: '600',
  },
  // 체크박스 관련 스타일
  checkboxContainer: {
    marginRight: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  checkboxSelected: {
    backgroundColor: Colors.primaryColor,
    borderColor: Colors.primaryColor,
  },
  checkmark: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // 선택된 항목 스타일
  partnerItemSelected: {
    backgroundColor: Colors.primaryColor + '15',
  },
  partnerNameSelected: {
    color: Colors.primaryColor,
    fontWeight: '600',
  },
  partnerStatusSelected: {
    color: Colors.primaryColor + 'CC',
  },
  partnerDateSelected: {
    color: Colors.primaryColor + 'AA',
  },
});

export default ExpertDetailScreen;
