import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { Colors } from '../../constants/colors';
import CustomHeader from '../../components/common/CustomHeader';
import ChatStartBottomSheet from '../../components/bottomsheets/ChatStartBottomSheet';
import { safeGoBack } from '../../utils/navigation/safeGoBack';
import BottomFixedButton from '../../components/common/BottomFixedButton';
import { supabase } from '../../utils/database/supabaseClient';
import { Expert } from '../../types/expert';

import { getExpertImage } from '../../utils/expert/getExpertImage';
import { getExpertListCache } from '../../utils/expert/expertListCache';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { startChatWithExpert } from '../../utils/chat/chatUtils';
import PartnerInputForm from '../../components/forms/PartnerInputForm';
import { PartnerBirthInfo, RelationshipStatus, RELATIONSHIP_STATUS_LABELS } from '../../types/partner';
import { getPartnerList, deletePartnerFromDatabase } from '../../utils/partner/partnerDatabase';
import { getPartnerListCache, isPartnerListFresh } from '../../utils/partner/partnerListCache';
import SabaLoader from '../../components/common/SabaLoader';
import { isIPad } from '../../utils/platform';
import { withSupabaseRetry } from '../../utils/network/retry';
import { useAppConfig } from '../../contexts/AppConfigContext';

const IS_IPAD = isIPad();

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
    message_mindfulness?: string;
    introduction: string;
    introduction_mindfulness?: string;
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
  const [compatExpertId, setCompatExpertId] = useState<string | null>(null);
  const [showChatBottomSheet, setShowChatBottomSheet] = useState(false);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [showPartnerSelection, setShowPartnerSelection] = useState(false);
  const [existingPartners, setExistingPartners] = useState<any[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedPartners, setSelectedPartners] = useState<Set<string>>(new Set());
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleteConfirmData, setDeleteConfirmData] = useState<{ type: 'selected' | 'single'; partnerId?: string; partnerName?: string } | null>(null);
  const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState('');
  const [showDeleteErrorModal, setShowDeleteErrorModal] = useState(false);
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

  // 연애 도사인 경우 궁합 전용 도사 ID를 동적으로 조회
  useEffect(() => {
    const loadCompatExpertId = async (): Promise<void> => {
      if (!expert || expert.category !== 'love') {
        setCompatExpertId(null);
        return;
      }
      try {
        const compatName: string = `${expert.name} (궁합 전용)`;
        const { data } = await supabase
          .from('experts')
          .select('id')
          .eq('name', compatName)
          .eq('category', expert.category)
          .maybeSingle();
        if (data && typeof (data as { id?: string }).id === 'string') {
          setCompatExpertId((data as { id: string }).id);
        } else {
          setCompatExpertId(expert.id);
        }
      } catch {
        setCompatExpertId(expert.id);
      }
    };
    void loadCompatExpertId();
  }, [expert]);

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
        const targetExpertId: string = compatExpertId ?? expert.id;
        navigation.navigate('PartnerInput', { expertId: targetExpertId });
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
      const targetExpertId: string = compatExpertId ?? expert.id;
      await startChatWithExpert(navigation, targetExpertId, partnerData);
    }
  };

  const handleAddNewPartner = () => {
    setShowPartnerSelection(false);
    if (expert?.id) {
      const targetExpertId: string = compatExpertId ?? expert.id;
      navigation.navigate('PartnerInput', { expertId: targetExpertId });
    }
  };

  const toggleEditMode = () => {
    if (isEditMode && selectedPartners.size > 0) {
      handleDeleteSelectedPartners();
      return;
    }

    setIsEditMode(!isEditMode);
    if (isEditMode) {
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

  const handleDeleteSelectedPartners = () => {
    if (selectedPartners.size === 0) return;
    setDeleteConfirmData({ type: 'selected' });
    setShowDeleteConfirmModal(true);
  };

  const executeDeleteSelectedPartners = async () => {
    setShowDeleteConfirmModal(false);
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
      setIsEditMode(false); // 삭제 완료 후 편집 모드 종료
      setDeleteSuccessMessage('선택된 상대방 정보가 삭제되었습니다.');
      setShowDeleteSuccessModal(true);
    } catch (error) {
      console.error('상대방 정보 삭제 오류:', error);
      setShowDeleteErrorModal(true);
    }
  };

  const handleDeletePartner = (partnerId: string, partnerName: string) => {
    setDeleteConfirmData({ type: 'single', partnerId, partnerName });
    setShowDeleteConfirmModal(true);
  };

  const executeDeletePartner = async () => {
    if (!deleteConfirmData?.partnerId) return;
    setShowDeleteConfirmModal(false);
    try {
      await deletePartnerFromDatabase(deleteConfirmData.partnerId);
      setExistingPartners(prev => prev.filter(partner => partner.id !== deleteConfirmData.partnerId));
      setDeleteSuccessMessage('상대방 정보가 삭제되었습니다.');
      setShowDeleteSuccessModal(true);
    } catch (error) {
      console.error('상대방 정보 삭제 오류:', error);
      setShowDeleteErrorModal(true);
    }
  };

  const handlePartnerInfoSave = async () => {
    // TODO: 상대방 정보 저장 로직 구현
    setShowPartnerModal(false);
    // 저장 후 채팅 시작
    if (expert?.id) {
      const targetExpertId: string = compatExpertId ?? expert.id;
      await startChatWithExpert(navigation, targetExpertId);
    }
  };

  const handlePartnerInfoCancel = () => {
    setShowPartnerModal(false);
  };

  const fetchExpertDetails = async (swr: boolean) => {
    try {
      const result = await withSupabaseRetry<any>(async () => {
        return await supabase
          .from('experts')
          .select(`
            *,
            expert_details(*)
          `)
          .eq('id', expertId)
          .single();
      });
      const data = result.data;
      const error = result.error;

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
        <SabaLoader message="" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 커스텀 헤더 */}
      <CustomHeader
        title="전문가 상세"
        onBackPress={() => safeGoBack(navigation)}
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
              <Text style={styles.sectionTitle}>
                도사님 한마디
              </Text>
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
              <Text style={styles.sectionTitle}>
                도사님 소개
              </Text>
            </View>
            <Text style={styles.introText}>
              {expert.expert_details.introduction}
            </Text>
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
            <View style={[styles.sectionContainer, { borderBottomWidth: 0, marginBottom: -15, paddingBottom: 0 }]}>
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

          {/* 5. 최근 리뷰 - 주석처리: 허위 후기로 오해받을 수 있어 심사 위험 */}
          {/* {expert.expert_details.recent_reviews && expert.expert_details.recent_reviews.length > 0 && (
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
          )} */}

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
              const targetExpertId: string = compatExpertId ?? expert.id;
              navigation.navigate('PartnerInput', { expertId: targetExpertId });
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
            <PartnerInputForm
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
              <TouchableOpacity onPress={toggleEditMode} style={styles.editButtonContainer}>
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

          {/* 내부 오버레이 모달 (삭제 확인) */}
          {showDeleteConfirmModal && (
            <View style={styles.confirmOverlay}>
              <View style={styles.confirmContent}>
                <Text style={styles.confirmTitle}>상대방 정보 삭제</Text>
                <Text style={styles.confirmMessage}>
                  {deleteConfirmData?.type === 'selected'
                    ? `선택된 ${selectedPartners.size}명의 정보를 삭제하시겠습니까?\n${existingPartners
                        .filter(partner => selectedPartners.has(partner.id))
                        .map(partner => partner.partner_name)
                        .join(', ')}`
                    : `${deleteConfirmData?.partnerName}님의 정보를 삭제하시겠습니까?`}
                </Text>
                <View style={styles.confirmActions}>
                  <TouchableOpacity 
                    style={styles.confirmButton} 
                    onPress={() => {
                      setShowDeleteConfirmModal(false);
                      setDeleteConfirmData(null);
                    }}
                  >
                    <Text style={styles.confirmCancelText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmButton, styles.confirmDeleteButton]}
                    onPress={() => {
                      if (deleteConfirmData?.type === 'selected') {
                        executeDeleteSelectedPartners();
                      } else {
                        executeDeletePartner();
                      }
                    }}
                  >
                    <Text style={styles.confirmDeleteText}>삭제</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* 내부 오버레이 모달 (삭제 완료) */}
          {showDeleteSuccessModal && (
            <View style={styles.confirmOverlay}>
              <View style={styles.confirmContent}>
                <Text style={styles.confirmTitle}>삭제 완료</Text>
                <Text style={styles.confirmMessage}>{deleteSuccessMessage}</Text>
                <View style={styles.confirmActions}>
                  <TouchableOpacity
                    style={[styles.confirmButton, styles.confirmConfirmButton]}
                    onPress={() => setShowDeleteSuccessModal(false)}
                  >
                    <Text style={styles.confirmConfirmText}>확인</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* 내부 오버레이 모달 (삭제 오류) */}
          {showDeleteErrorModal && (
            <View style={styles.confirmOverlay}>
              <View style={styles.confirmContent}>
                <Text style={styles.confirmTitle}>오류</Text>
                <Text style={styles.confirmMessage}>상대방 정보 삭제에 실패했습니다.</Text>
                <View style={styles.confirmActions}>
                  <TouchableOpacity
                    style={[styles.confirmButton, styles.confirmConfirmButton]}
                    onPress={() => setShowDeleteErrorModal(false)}
                  >
                    <Text style={styles.confirmConfirmText}>확인</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
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
    height: IS_IPAD ? 700 : 370,
    width: '92%',
    alignSelf: 'center',
    margin: IS_IPAD ? 20 : 10,
    borderRadius: IS_IPAD ? 24 : 15,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0', // 디버깅용 배경색
  },
  expertImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    paddingHorizontal: IS_IPAD ? 30 : 20,
    paddingVertical: IS_IPAD ? 24 : 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: IS_IPAD ? 12 : 8,
  },
  title: {
    fontSize: IS_IPAD ? 28 : 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  hashtagText: {
    fontSize: IS_IPAD ? 18 : 12,
    fontWeight: '500',
    color: Colors.primaryColor,
    letterSpacing: -0.2,
  },
  specialtyTagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: IS_IPAD ? 24 : 16,
  },
  specialtyTag: {
    backgroundColor: Colors.primaryColor + '0D',
    paddingHorizontal: IS_IPAD ? 16 : 12,
    paddingVertical: IS_IPAD ? 8 : 6,
    borderRadius: IS_IPAD ? 20 : 14,
    marginRight: IS_IPAD ? 10 : 6,
    marginBottom: 4,
    borderWidth: 0.3,
    borderColor: Colors.primaryColor + '30',
  },
  specialtyTagText: {
    fontSize: IS_IPAD ? 16 : 12,
    fontWeight: '500',
    color: Colors.primaryColor,
    letterSpacing: -0.2,
  },
  quoteBorder: {
    borderWidth: 0.5,
    borderColor: Colors.primaryColor + '20',
    borderRadius: IS_IPAD ? 20 : 14,
    paddingVertical: IS_IPAD ? 24 : 16,
    paddingHorizontal: IS_IPAD ? 30 : 20,
    backgroundColor: Platform.OS === 'android' ? '#F5F6FF' : Colors.primaryColor + '08',
    ...(Platform.OS === 'ios' ? {
      shadowColor: Colors.primaryColor,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.05,
      shadowRadius: 4,
    } : {}),
  },
  quoteBorderText: {
    fontSize: IS_IPAD ? 20 : 15,
    fontWeight: '500',
    color: '#555',
    lineHeight: IS_IPAD ? 32 : 24,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  messageText: {
    fontSize: IS_IPAD ? 18 : 14,
    color: '#000',
    lineHeight: IS_IPAD ? 30 : 22,
    textAlign: 'left',
  },
  sectionContainer: {
    paddingTop: IS_IPAD ? 16 : 10,
    paddingBottom: IS_IPAD ? 32 : 24,
    marginBottom: IS_IPAD ? 16 : 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionHeader: {
    marginBottom: IS_IPAD ? 16 : 12,
  },
  sectionTitle: {
    fontSize: IS_IPAD ? 22 : 16,
    fontWeight: 'bold',
    color: '#333',
  },
  introText: {
    fontSize: IS_IPAD ? 18 : 14,
    color: '#444',
    lineHeight: IS_IPAD ? 30 : 24,
  },
  topicsContainer: {
    gap: IS_IPAD ? 16 : 10,
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  topicBullet: {
    fontSize: IS_IPAD ? 18 : 14,
    color: Colors.primaryColor,
    marginRight: 8,
    fontWeight: 'bold',
  },
  topicText: {
    fontSize: IS_IPAD ? 18 : 14,
    color: '#333',
    flex: 1,
    lineHeight: IS_IPAD ? 28 : 20,
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
    padding: IS_IPAD ? 20 : 14,
    borderRadius: IS_IPAD ? 14 : 10,
    marginBottom: IS_IPAD ? 16 : 12,
  },
  caseLabel: {
    fontSize: IS_IPAD ? 16 : 11,
    fontWeight: '600',
    color: '#999',
    marginBottom: IS_IPAD ? 6 : 4,
    marginTop: IS_IPAD ? 12 : 8,
  },
  caseText: {
    fontSize: IS_IPAD ? 18 : 13,
    color: '#333',
    lineHeight: IS_IPAD ? 28 : 20,
    marginBottom: 4,
  },
  caseResultText: {
    fontSize: IS_IPAD ? 18 : 13,
    color: Colors.primaryColor,
    lineHeight: IS_IPAD ? 28 : 20,
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
  placeholderImage: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: IS_IPAD ? 30 : 20,
  },
  partnerSelectionTitle: {
    fontSize: IS_IPAD ? 26 : 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2
  },
  partnerSelectionSubtitle: {
    fontSize: IS_IPAD ? 18 : 13,
    color: '#666',
    marginBottom: IS_IPAD ? 32 : 24,
    lineHeight: IS_IPAD ? 28 : 20,
  },
  partnerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: IS_IPAD ? 24 : 16,
    borderRadius: IS_IPAD ? 16 : 12,
    marginBottom: IS_IPAD ? 16 : 12,
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: IS_IPAD ? 20 : 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: IS_IPAD ? 6 : 4,
  },
  partnerStatus: {
    fontSize: IS_IPAD ? 18 : 14,
    color: '#666',
    marginBottom: IS_IPAD ? 4 : 2,
  },
  partnerDate: {
    fontSize: IS_IPAD ? 16 : 12,
    color: '#999',
  },
  partnerArrow: {
    fontSize: IS_IPAD ? 24 : 18,
    color: '#666',
    marginLeft: IS_IPAD ? 16 : 12,
  },
  addNewPartnerButton: {
    backgroundColor: Colors.primaryColor,
    padding: IS_IPAD ? 20 : 16,
    borderRadius: IS_IPAD ? 16 : 12,
    alignItems: 'center',
    marginTop: IS_IPAD ? 12 : 8,
  },
  addNewPartnerText: {
    color: 'white',
    fontSize: IS_IPAD ? 20 : 13,
    fontWeight: '600',
  },
  // 스와이프 삭제 관련 스타일
  swipeDeleteHint: {
    fontSize: IS_IPAD ? 16 : 10,
    color: '#999',
    marginTop: IS_IPAD ? 12 : 8,
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
  editButtonContainer: {
    minWidth: IS_IPAD ? 80 : 60,
    alignItems: 'flex-end',
  },
  editButtonText: {
    color: Colors.primaryColor,
    fontSize: IS_IPAD ? 18 : 14,
    fontWeight: '600',
  },
  // 체크박스 관련 스타일
  checkboxContainer: {
    marginRight: IS_IPAD ? 24 : 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: IS_IPAD ? 26 : 20,
    height: IS_IPAD ? 26 : 20,
    borderRadius: IS_IPAD ? 6 : 4,
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
    fontSize: IS_IPAD ? 16 : 12,
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
  // 커스텀 모달 스타일 (iOS 중첩 모달 문제 해결용)
  confirmOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: IS_IPAD ? 40 : 24,
    zIndex: 1000,
  },
  confirmContent: {
    width: IS_IPAD ? '100%' : '85%',
    maxWidth: IS_IPAD ? 500 : 340,
    backgroundColor: 'white',
    borderRadius: IS_IPAD ? 20 : 14,
    paddingTop: IS_IPAD ? 40 : 24,
    paddingBottom: IS_IPAD ? 32 : 20,
    paddingHorizontal: IS_IPAD ? 40 : 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  confirmTitle: {
    fontSize: IS_IPAD ? 28 : 18,
    fontWeight: '800',
    color: '#111',
    marginBottom: IS_IPAD ? 20 : 12,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: IS_IPAD ? 18 : 14,
    color: '#555',
    lineHeight: IS_IPAD ? 28 : 20,
    marginBottom: IS_IPAD ? 30 : 20,
    textAlign: 'center',
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: IS_IPAD ? 16 : 8,
  },
  confirmButton: {
    flex: 1,
    paddingHorizontal: IS_IPAD ? 24 : 12,
    paddingVertical: IS_IPAD ? 20 : 12,
    borderRadius: IS_IPAD ? 14 : 8,
    marginHorizontal: IS_IPAD ? 6 : 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f3f5',
  },
  confirmDeleteButton: {
    backgroundColor: '#ff4444',
  },
  confirmConfirmButton: {
    backgroundColor: Colors.primaryColor,
  },
  confirmCancelText: {
    color: '#333',
    fontSize: IS_IPAD ? 20 : 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  confirmDeleteText: {
    color: 'white',
    fontSize: IS_IPAD ? 20 : 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  confirmConfirmText: {
    color: 'white',
    fontSize: IS_IPAD ? 20 : 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default ExpertDetailScreen;
