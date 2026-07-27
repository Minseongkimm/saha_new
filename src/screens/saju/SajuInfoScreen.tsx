import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Platform,
  StatusBar,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { supabase } from '../../utils/database/supabaseClient';
import { calculateSaju } from '../../utils/saju/ganji_local';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SabaLoader from '../../components/common/SabaLoader';
import Icon from 'react-native-vector-icons/Ionicons';
import BirthInfoForm from '../../components/forms/BirthInfoForm';
import { SajuCache } from '../../utils/saju/sajuCache';
import { TodayFortuneCache } from '../../utils/today-fortune/todayFortuneCache';
import { clearAllNewYearFortuneCache } from '../../utils/new-year-fortune/newYearFortuneCache';
import { convertSajuResultToDbFormat } from '../../utils/saju/calculatedSajuUtils';
import { getCurrentUserSafely } from '../../utils/user/authUtils';
import { safeGoBack } from '../../utils/navigation/safeGoBack';
import { isIPad } from '../../utils/platform';
import { deletePartnerFromDatabase, getPartnerList } from '../../utils/partner/partnerDatabase';
import { PartnerSaju, RELATIONSHIP_STATUS_LABELS, RelationshipStatus } from '../../types/partner';

const IS_IPAD = isIPad();

interface SajuInfoScreenProps {
  navigation: any;
}

const SajuInfoScreen: React.FC<SajuInfoScreenProps> = ({ navigation }) => {
  const [sajuInfo, setSajuInfo] = useState({
    name: '',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    birthHour: '',
    birthMinute: '',
    gender: '',
    calendarType: '',
    isLeapMonth: false,
    timeUnknown: false,
  });

  const [originalSajuInfo, setOriginalSajuInfo] = useState({
    name: '',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    birthHour: '',
    birthMinute: '',
    gender: '',
    calendarType: '',
    isLeapMonth: false,
    timeUnknown: false,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [partners, setPartners] = useState<PartnerSaju[]>([]);

  const yearScrollRef = useRef<ScrollView>(null);
  const monthScrollRef = useRef<ScrollView>(null);
  const dayScrollRef = useRef<ScrollView>(null);
  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);

  // 사용자 정보 로드
  useEffect(() => {
    loadUserBirthInfo();
  }, []);

  // 상대방 추가/수정 후 이 화면으로 돌아왔을 때 목록 최신화
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadPartnerInfos();
    });
    return unsubscribe;
  }, [navigation]);

  const loadUserBirthInfo = async () => {
    try {
      setLoading(true);
      
      // 현재 로그인된 사용자 정보 가져오기
      const { status, user } = await getCurrentUserSafely();
      if (status === 'network_error') {
        // 네트워크 이슈일 때는 유저에게 알림을 띄우지 않고 조용히 중단
        setLoading(false);
        return;
      }
      if (status === 'unauthenticated' || !user) {
        Alert.alert('오류', '로그인이 필요합니다.');
        safeGoBack(navigation);
        return;
      }

      setUserId(user.id);
      loadPartnerInfos();

      // 사용자 이름은 Auth 메타데이터에서 가져오기
      const userName = user.user_metadata?.name || 
                      user.user_metadata?.full_name || 
                      user.user_metadata?.preferred_username || 
                      user.user_metadata?.user_name || 
                      user.email?.split('@')[0] || 
                      '사용자';

      // 캐시 우선 표시
      const cacheKey = `birth_info_${user.id}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (cachedData) {
        const parsedCache = JSON.parse(cachedData);
        const cachedName = parsedCache.name || userName;
        // 이름이 "여행객"일 경우 모든 값을 빈 값으로 초기화
        let initialData;
        if (cachedName === '여행객') {
          initialData = {
            name: '',
            birthYear: '',
            birthMonth: '',
            birthDay: '',
            birthHour: '',
            birthMinute: '',
            gender: '',
            calendarType: '',
            isLeapMonth: false,
            timeUnknown: false,
          };
        } else {
          initialData = {
            name: cachedName,
            birthYear: parsedCache.year?.toString() || '',
            birthMonth: parsedCache.month?.toString() || '',
            birthDay: parsedCache.day?.toString() || '',
            birthHour: parsedCache.hour?.toString() || '',
            birthMinute: parsedCache.minute?.toString() || '',
            gender: parsedCache.gender === 'male' ? '남성' : parsedCache.gender === 'female' ? '여성' : '',
            calendarType: parsedCache.calendar_type === 'lunar' ? '음력' : parsedCache.calendar_type === 'solar' ? '양력' : '',
            isLeapMonth: parsedCache.is_leap_month || false,
            timeUnknown: parsedCache.is_time_unknown || false,
          };
        }
        setSajuInfo(initialData);
        setOriginalSajuInfo(initialData);
        setLoading(false);
      }

      // 백그라운드에서 최신 데이터 가져오기
      const { data: birthData, error: birthError } = await supabase
        .from('birth_info')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (birthError && birthError.code !== 'PGRST116') {
        throw birthError;
      }

      if (birthData) {
        // 캐시 업데이트
        await AsyncStorage.setItem(cacheKey, JSON.stringify(birthData));
        
        const finalName = birthData.name || userName;
        // 이름이 "여행객"일 경우 모든 값을 빈 값으로 초기화
        let finalData;
        if (finalName === '여행객') {
          finalData = {
            name: '',
            birthYear: '',
            birthMonth: '',
            birthDay: '',
            birthHour: '',
            birthMinute: '',
            gender: '',
            calendarType: '',
            isLeapMonth: false,
            timeUnknown: false,
          };
        } else {
          // 데이터베이스에서 가져온 정보로 상태 업데이트
          finalData = {
            name: finalName,
            birthYear: birthData.year?.toString() || '',
            birthMonth: birthData.month?.toString() || '',
            birthDay: birthData.day?.toString() || '',
            birthHour: birthData.hour?.toString() || '',
            birthMinute: birthData.minute?.toString() || '',
            gender: birthData.gender === 'male' ? '남성' : birthData.gender === 'female' ? '여성' : '',
            calendarType: birthData.calendar_type === 'lunar' ? '음력' : birthData.calendar_type === 'solar' ? '양력' : '',
            isLeapMonth: birthData.is_leap_month || false,
            timeUnknown: birthData.is_time_unknown || false,
          };
        }
        setSajuInfo(finalData);
        setOriginalSajuInfo(finalData);
      } else {
        // 데이터가 없으면 이름 확인 후 설정
        let defaultData;
        if (userName === '여행객') {
          // 이름이 "여행객"이면 모든 값을 빈 값으로 초기화
          defaultData = {
            name: '',
            birthYear: '',
            birthMonth: '',
            birthDay: '',
            birthHour: '',
            birthMinute: '',
            gender: '',
            calendarType: '',
            isLeapMonth: false,
            timeUnknown: false,
          };
        } else {
          // 기본값 설정
          defaultData = {
            name: userName,
            birthYear: '',
            birthMonth: '',
            birthDay: '',
            birthHour: '',
            birthMinute: '',
            gender: '',
            calendarType: '',
            isLeapMonth: false,
            timeUnknown: true,
          };
        }
        setSajuInfo(defaultData);
        setOriginalSajuInfo(defaultData);
      }
    } catch (error) {
      console.error('Error loading user birth info:', error);
      Alert.alert('오류', '사주 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadPartnerInfos = async () => {
    try {
      const items = await getPartnerList();
      setPartners(items as PartnerSaju[]);
    } catch (error) {
      console.error('Error loading partner infos:', error);
    }
  };

  useEffect(() => {
    if (showDatePicker) {
      const yearIndex = parseInt(sajuInfo.birthYear) - 1924;
      const yearOffset = yearIndex * 56;
      
      setTimeout(() => {
        yearScrollRef.current?.scrollTo({ y: yearOffset, animated: false });
        monthScrollRef.current?.scrollTo({ y: (parseInt(sajuInfo.birthMonth) - 1) * 56, animated: false });
        dayScrollRef.current?.scrollTo({ y: (parseInt(sajuInfo.birthDay) - 1) * 56, animated: false });
      }, 100);
    }
  }, [showDatePicker]);

  useEffect(() => {
    if (showTimePicker) {
      const hourOffset = parseInt(sajuInfo.birthHour) * 56;
      const minuteOffset = parseInt(sajuInfo.birthMinute) * 56;
      
      setTimeout(() => {
        hourScrollRef.current?.scrollTo({ y: hourOffset, animated: false });
        minuteScrollRef.current?.scrollTo({ y: minuteOffset, animated: false });
      }, 100);
    }
  }, [showTimePicker]);

  const handleSave = async () => {
    if (!userId) {
      Alert.alert('오류', '사용자 정보를 찾을 수 없습니다.');
      return;
    }

    if (!sajuInfo.name.trim()) {
      Alert.alert('오류', '이름을 입력해주세요.');
      return;
    }

    if (!sajuInfo.birthYear || !sajuInfo.birthMonth || !sajuInfo.birthDay) {
      Alert.alert('오류', '생년월일을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);

      // 사주 재계산
      const sajuResult = calculateSaju({
        year: parseInt(sajuInfo.birthYear),
        month: parseInt(sajuInfo.birthMonth),
        day: parseInt(sajuInfo.birthDay),
        hour: sajuInfo.timeUnknown || !sajuInfo.birthHour ? 0 : parseInt(sajuInfo.birthHour),
        minute: sajuInfo.timeUnknown || !sajuInfo.birthMinute ? 0 : parseInt(sajuInfo.birthMinute),
        isLunar: sajuInfo.calendarType === '음력',
        isLeapMonth: sajuInfo.isLeapMonth,
      });

      const birthInfoData = {
        user_id: userId,
        name: sajuInfo.name.trim(),
        year: parseInt(sajuInfo.birthYear),
        month: parseInt(sajuInfo.birthMonth),
        day: parseInt(sajuInfo.birthDay),
        hour: sajuInfo.timeUnknown || !sajuInfo.birthHour ? null : parseInt(sajuInfo.birthHour),
        minute: sajuInfo.timeUnknown || !sajuInfo.birthMinute ? null : parseInt(sajuInfo.birthMinute),
        is_time_unknown: sajuInfo.timeUnknown,
        calendar_type: sajuInfo.calendarType === '음력' ? 'lunar' : sajuInfo.calendarType === '양력' ? 'solar' : null,
        is_leap_month: sajuInfo.isLeapMonth,
        gender: sajuInfo.gender === '남성' ? 'male' : sajuInfo.gender === '여성' ? 'female' : null,
      };

      // 기존 데이터 확인 후 업데이트 또는 삽입
      const { data: existingData } = await supabase
        .from('birth_info')
        .select('id')
        .eq('user_id', userId)
        .single();

      let birthInfoId: string;
      let error;
      if (existingData) {
        // 기존 데이터가 있으면 업데이트
        birthInfoId = existingData.id;
        const { error: updateError } = await supabase
          .from('birth_info')
          .update(birthInfoData)
          .eq('user_id', userId);
        error = updateError;
      } else {
        // 기존 데이터가 없으면 삽입
        const { data: insertedData, error: insertError } = await supabase
          .from('birth_info')
          .insert(birthInfoData)
          .select('id')
          .single();
        error = insertError;
        birthInfoId = insertedData?.id;
      }

      if (error || !birthInfoId) throw error;

      // calculated_saju 테이블에 사주 데이터 저장
      const calculatedSajuData = {
        birth_info_id: birthInfoId,
        ...convertSajuResultToDbFormat(sajuResult),
      };

      const { error: calculatedSajuError } = await supabase
        .from('calculated_saju')
        .upsert(calculatedSajuData, {
          onConflict: 'birth_info_id',
        });

      if (calculatedSajuError) {
        console.error('calculated_saju 저장 오류:', calculatedSajuError);
        throw new Error('사주 데이터 저장에 실패했습니다.');
      }

      // 생년월일이 변경되었으므로 해당 사용자의 모든 사주 분석 데이터 삭제
      const { error: deleteAnalysisError } = await supabase
        .from('saju_analyses')
        .delete()
        .eq('user_id', userId);

      if (deleteAnalysisError) {
        console.error('saju_analyses 삭제 오류:', deleteAnalysisError);
        // 분석 데이터 삭제 실패는 치명적이지 않으므로 계속 진행
      }

      // 생년월일이 변경되었으므로 모든 사주 관련 캐시 삭제
      await SajuCache.clearUserCache(userId);
      await TodayFortuneCache.clearTodayFortuneCache(userId);
      await clearAllNewYearFortuneCache(userId);

      // 로컬 birth_info 캐시 업데이트
      const cacheKey = `birth_info_${userId}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(birthInfoData));

      Alert.alert('저장 완료', '사주 정보가 저장되었습니다.');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving birth info:', error);
      Alert.alert('오류', '사주 정보 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSajuInfo(originalSajuInfo);
    setIsEditing(false);
  };

  const handleDateSelect = (year: string, month: string, day: string) => {
    setSajuInfo({
      ...sajuInfo,
      birthYear: year,
      birthMonth: month,
      birthDay: day,
    });
  };

  const handleTimeSelect = (hour: string, minute: string) => {
    setSajuInfo({
      ...sajuInfo,
      birthHour: hour,
      birthMinute: minute,
    });
  };

  const formatBirthDate = (birthInfo: any) => {
    if (!birthInfo?.birthYear || !birthInfo?.birthMonth || !birthInfo?.birthDay) {
      return '생년월일 정보 없음';
    }
    return `${birthInfo.birthYear}년 ${birthInfo.birthMonth}월 ${birthInfo.birthDay}일`;
  };

  const formatBirthTime = (birthInfo: any) => {
    if (birthInfo?.isTimeUnknown || !birthInfo?.birthHour || !birthInfo?.birthMinute) {
      return '시간 모름';
    }
    return `${birthInfo.birthHour}시 ${birthInfo.birthMinute}분`;
  };

  const formatCalendarType = (birthInfo: any) => (
    birthInfo?.calendarType === 'lunar' ? '음력' : '양력'
  );

  const handleEditPartner = (partner: PartnerSaju) => {
    navigation.navigate('PartnerInput', {
      editPartnerId: partner.id,
      returnToSajuInfo: true,
    });
  };

  const handleAddPartner = () => {
    navigation.navigate('PartnerInput', {
      returnToSajuInfo: true,
    });
  };

  const handleDeletePartner = (partner: PartnerSaju) => {
    Alert.alert(
      '상대방 정보 삭제',
      `${partner.partner_name || '상대방'}님의 정보를 삭제할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePartnerFromDatabase(partner.id);
              setPartners((prev) => prev.filter((item) => item.id !== partner.id));
            } catch (error) {
              console.error('Error deleting partner:', error);
              Alert.alert('오류', '상대방 정보 삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 24 : 0;
  const headerTopPadding = statusBarHeight + (IS_IPAD ? 10 : 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { paddingTop: headerTopPadding }]}>
          <TouchableOpacity onPress={() => safeGoBack(navigation)} style={styles.backButton}>
            <Icon name="arrow-back" size={IS_IPAD ? 28 : 24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>사주 정보 관리</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <SabaLoader message="사주 정보를 불러오는 중" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { paddingTop: headerTopPadding }]}>
          <TouchableOpacity onPress={() => safeGoBack(navigation)} style={styles.backButton}>
            <Icon name="arrow-back" size={IS_IPAD ? 28 : 24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>정보 관리</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.contentContainer}>
        <View style={styles.infoCard}>
          {!isEditing && (
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>내 정보</Text>
                <Text style={styles.cardTitle}>본인 생년월일</Text>
              </View>
              <TouchableOpacity onPress={() => {
                setOriginalSajuInfo(sajuInfo);
                setIsEditing(true);
              }} style={styles.editButton}>
                <Text style={styles.editButtonText}>수정</Text>
              </TouchableOpacity>
            </View>
          )}

          {isEditing ? (
            <View style={styles.editContainer}>
              <View style={styles.editContent}>
                <View style={styles.editHeader}>
                  <Text style={styles.editTitle}>정보 수정</Text>
                  <Text style={styles.editSubtitle}>
                    사바세계 탐험을 위해 정보를 입력 해주세요
                  </Text>
                </View>
                <BirthInfoForm
                  data={{
                    name: sajuInfo.name,
                    birthYear: sajuInfo.birthYear,
                    birthMonth: sajuInfo.birthMonth,
                    birthDay: sajuInfo.birthDay,
                    birthHour: sajuInfo.birthHour,
                    birthMinute: sajuInfo.birthMinute,
                    gender: sajuInfo.gender as '남성' | '여성' | '',
                    calendarType: sajuInfo.calendarType as '양력' | '음력' | '',
                    isLeapMonth: sajuInfo.isLeapMonth,
                    isTimeUnknown: sajuInfo.timeUnknown,
                  }}
                  onChange={(field, value) => {
                    // 필드명 매핑: isTimeUnknown -> timeUnknown
                    const mappedField = field === 'isTimeUnknown' ? 'timeUnknown' : field;
                    setSajuInfo(prev => ({ ...prev, [mappedField]: value }));
                  }}
                  showName={true}
                />
              </View>
              <View style={styles.buttonContainer}>
                <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                  <Text style={styles.saveButtonText}>저장</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.selfInfoGrid}>
              <View style={styles.selfInfoItem}>
                <Text style={styles.selfInfoLabel}>이름</Text>
                <Text style={styles.selfInfoValue} numberOfLines={1}>
                  {sajuInfo.name || '여행객'}
                </Text>
              </View>

              <View style={styles.selfInfoItem}>
                <Text style={styles.selfInfoLabel}>생년월일</Text>
                <Text style={[
                  styles.selfInfoValue,
                  (!sajuInfo.birthYear || !sajuInfo.birthMonth || !sajuInfo.birthDay) && styles.infoValueEmpty
                ]} numberOfLines={1}>
                  {sajuInfo.birthYear && sajuInfo.birthMonth && sajuInfo.birthDay
                    ? `${sajuInfo.birthYear}년 ${sajuInfo.birthMonth}월 ${sajuInfo.birthDay}일`
                    : '입력 필요'}
                </Text>
              </View>

              <View style={styles.selfInfoItem}>
                <Text style={styles.selfInfoLabel}>성별</Text>
                <Text style={[
                  styles.selfInfoValue,
                  !sajuInfo.gender && styles.infoValueEmpty
                ]}>
                  {sajuInfo.gender || '입력 필요'}
                </Text>
              </View>

              <View style={styles.selfInfoItem}>
                <Text style={styles.selfInfoLabel}>음/양력</Text>
                <Text style={[
                  styles.selfInfoValue,
                  !sajuInfo.calendarType && styles.infoValueEmpty
                ]}>
                  {sajuInfo.calendarType || '입력 필요'}
                </Text>
              </View>

              {sajuInfo.calendarType === '음력' && (
                <View style={styles.selfInfoItem}>
                  <Text style={styles.selfInfoLabel}>윤달</Text>
                  <Text style={styles.selfInfoValue}>
                    {sajuInfo.isLeapMonth ? '네' : '아니오'}
                  </Text>
                </View>
              )}

              <View style={styles.selfInfoItem}>
                <Text style={styles.selfInfoLabel}>태어난 시간</Text>
                <Text style={[
                  styles.selfInfoValue,
                  (sajuInfo.timeUnknown || !sajuInfo.birthHour || !sajuInfo.birthMinute) && styles.infoValueEmpty
                ]} numberOfLines={1}>
                  {sajuInfo.timeUnknown || !sajuInfo.birthHour || !sajuInfo.birthMinute
                    ? '입력 필요'
                    : `${sajuInfo.birthHour}시 ${sajuInfo.birthMinute}분`}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.partnerSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>상대방 정보</Text>
              <Text style={styles.sectionTitle}>상대방 정보</Text>
            </View>
            <View style={styles.partnerHeaderRight}>
              <Text style={styles.partnerCount}>{partners.length}명</Text>
              <TouchableOpacity
                style={styles.partnerAddButton}
                onPress={handleAddPartner}
              >
                <Text style={styles.partnerAddButtonText}>추가</Text>
              </TouchableOpacity>
            </View>
          </View>

          {partners.length === 0 ? (
            <View style={styles.emptyPartnerCard}>
              <Text style={styles.emptyPartnerTitle}>저장된 상대방 정보가 없습니다</Text>
              <Text style={styles.emptyPartnerText}>
                대화 중 궁합을 보거나 상대방 정보를 입력하면 여기에 표시됩니다.
              </Text>
            </View>
          ) : (
            <View style={styles.partnerList}>
              {partners.map((partner) => {
                const birthInfo = partner.birth_info || {};
                const relationshipLabel = RELATIONSHIP_STATUS_LABELS[
                  (partner.relationship_status || 'interested') as RelationshipStatus
                ];
                return (
                  <View key={partner.id} style={styles.partnerCard}>
                    <View style={styles.partnerCardHeader}>
                      <View style={styles.partnerTitleBlock}>
                        <Text style={styles.partnerName} numberOfLines={1}>
                          {partner.partner_name || '이름 없음'}
                        </Text>
                        <Text style={styles.partnerMeta} numberOfLines={1}>
                          {relationshipLabel}
                        </Text>
                      </View>
                      <View style={styles.partnerActionRow}>
                        <TouchableOpacity
                          style={styles.partnerActionButton}
                          onPress={() => handleEditPartner(partner)}
                        >
                          <Text style={styles.partnerActionText}>수정</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.partnerActionButton, styles.partnerDeleteButton]}
                          onPress={() => handleDeletePartner(partner)}
                        >
                          <Text style={[styles.partnerActionText, styles.partnerDeleteText]}>삭제</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.partnerInfoGrid}>
                      <View style={styles.partnerInfoItem}>
                        <Text style={styles.partnerInfoLabel}>생년월일</Text>
                        <Text style={styles.partnerInfoValue}>{formatBirthDate(birthInfo)}</Text>
                      </View>
                      <View style={styles.partnerInfoItem}>
                        <Text style={styles.partnerInfoLabel}>태어난 시간</Text>
                        <Text style={styles.partnerInfoValue}>{formatBirthTime(birthInfo)}</Text>
                      </View>
                      <View style={styles.partnerInfoItem}>
                        <Text style={styles.partnerInfoLabel}>음/양력</Text>
                        <Text style={styles.partnerInfoValue}>{formatCalendarType(birthInfo)}</Text>
                      </View>
                      <View style={styles.partnerInfoItem}>
                        <Text style={styles.partnerInfoLabel}>성별</Text>
                        <Text style={styles.partnerInfoValue}>
                          {birthInfo.gender === 'male' ? '남성' : birthInfo.gender === 'female' ? '여성' : '정보 없음'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
        </View>
      </ScrollView>

      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>생년월일 선택</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.pickerContainer}>
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>년</Text>
                <ScrollView 
                  ref={yearScrollRef}
                  style={styles.pickerScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {Array.from({length: 100}, (_, i) => 1924 + i).map(year => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.pickerItem,
                        sajuInfo.birthYear === year.toString() && styles.pickerItemSelected
                      ]}
                      onPress={() => handleDateSelect(year.toString(), sajuInfo.birthMonth, sajuInfo.birthDay)}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        sajuInfo.birthYear === year.toString() && styles.pickerItemTextSelected
                      ]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>월</Text>
                <ScrollView 
                  ref={monthScrollRef}
                  style={styles.pickerScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {Array.from({length: 12}, (_, i) => i + 1).map(month => (
                    <TouchableOpacity
                      key={month}
                      style={[
                        styles.pickerItem,
                        sajuInfo.birthMonth === month.toString() && styles.pickerItemSelected
                      ]}
                      onPress={() => handleDateSelect(sajuInfo.birthYear, month.toString(), sajuInfo.birthDay)}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        sajuInfo.birthMonth === month.toString() && styles.pickerItemTextSelected
                      ]}>
                        {month}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>일</Text>
                <ScrollView 
                  ref={dayScrollRef}
                  style={styles.pickerScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {Array.from({length: 31}, (_, i) => i + 1).map(day => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.pickerItem,
                        sajuInfo.birthDay === day.toString() && styles.pickerItemSelected
                      ]}
                      onPress={() => handleDateSelect(sajuInfo.birthYear, sajuInfo.birthMonth, day.toString())}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        sajuInfo.birthDay === day.toString() && styles.pickerItemTextSelected
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.modalButtonText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showTimePicker}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>시간 선택</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.pickerContainer}>
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>시</Text>
                <ScrollView 
                  ref={hourScrollRef}
                  style={styles.pickerScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {Array.from({length: 24}, (_, i) => i).map(hour => (
                    <TouchableOpacity
                      key={hour}
                      style={[
                        styles.pickerItem,
                        sajuInfo.birthHour === hour.toString() && styles.pickerItemSelected
                      ]}
                      onPress={() => handleTimeSelect(hour.toString(), sajuInfo.birthMinute)}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        sajuInfo.birthHour === hour.toString() && styles.pickerItemTextSelected
                      ]}>
                        {hour}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>분</Text>
                <ScrollView 
                  ref={minuteScrollRef}
                  style={styles.pickerScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {Array.from({length: 60}, (_, i) => i).map(minute => (
                    <TouchableOpacity
                      key={minute}
                      style={[
                        styles.pickerItem,
                        sajuInfo.birthMinute === minute.toString() && styles.pickerItemSelected
                      ]}
                      onPress={() => handleTimeSelect(sajuInfo.birthHour, minute.toString())}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        sajuInfo.birthMinute === minute.toString() && styles.pickerItemTextSelected
                      ]}>
                        {minute}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => setShowTimePicker(false)}
            >
              <Text style={styles.modalButtonText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: IS_IPAD ? 30 : 20,
    paddingBottom: IS_IPAD ? 20 : 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: IS_IPAD ? 12 : 8,
  },
  headerTitle: {
    fontSize: IS_IPAD ? 24 : 18,
    fontWeight: '600',
    color: '#333',
  },
  headerRight: {
    width: IS_IPAD ? 56 : 40,
  },
  contentContainer: {
    paddingHorizontal: IS_IPAD ? 36 : 18,
    paddingTop: IS_IPAD ? 24 : 18,
    paddingBottom: IS_IPAD ? 48 : 34,
    gap: IS_IPAD ? 22 : 16,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: IS_IPAD ? 18 : 14,
    borderWidth: 1,
    borderColor: '#ececec',
    padding: IS_IPAD ? 26 : 18,
  },
  editContainer: {
    paddingTop: 0,
  },
  editContent: {
    flexGrow: 1,
  },
  editHeader: {
    marginTop: 4,
    marginBottom: IS_IPAD ? 36 : (Platform.OS === 'android' ? 13 : 28),
    alignItems: 'center',
  },
  editTitle: {
    fontSize: IS_IPAD ? 28 : 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: IS_IPAD ? 8 : 4,
    textAlign: 'center',
  },
  editSubtitle: {
    fontSize: IS_IPAD ? 18 : 14,
    color: '#6b7280',
    lineHeight: IS_IPAD ? 28 : 20,
    textAlign: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: IS_IPAD ? 18 : 14,
  },
  sectionEyebrow: {
    fontSize: IS_IPAD ? 15 : 11,
    color: Colors.primaryColor,
    fontWeight: '700',
    marginBottom: IS_IPAD ? 6 : 3,
  },
  cardTitle: {
    fontSize: IS_IPAD ? 24 : 18,
    fontWeight: '700',
    color: '#1d1d1f',
  },
  editButton: {
    backgroundColor: '#f4f4f5',
    paddingHorizontal: IS_IPAD ? 16 : 12,
    paddingVertical: IS_IPAD ? 8 : 6,
    borderRadius: IS_IPAD ? 14 : 11,
  },
  editButtonText: {
    color: '#3f3f46',
    fontSize: IS_IPAD ? 14 : 11,
    fontWeight: '700',
  },
  selfInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: IS_IPAD ? 12 : 8,
  },
  selfInfoItem: {
    width: '48%',
    backgroundColor: '#fafafa',
    borderRadius: IS_IPAD ? 14 : 10,
    borderWidth: 1,
    borderColor: '#f1f1f1',
    paddingHorizontal: IS_IPAD ? 16 : 12,
    paddingVertical: IS_IPAD ? 14 : 10,
  },
  selfInfoLabel: {
    fontSize: IS_IPAD ? 14 : 11,
    color: '#8e8e93',
    fontWeight: '600',
    marginBottom: IS_IPAD ? 6 : 4,
  },
  selfInfoValue: {
    fontSize: IS_IPAD ? 16 : 12,
    color: '#1d1d1f',
    fontWeight: '600',
  },
  partnerSection: {
    gap: IS_IPAD ? 16 : 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: IS_IPAD ? 4 : 2,
  },
  sectionTitle: {
    fontSize: IS_IPAD ? 24 : 18,
    fontWeight: '700',
    color: '#1d1d1f',
  },
  partnerHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: IS_IPAD ? 12 : 8,
  },
  partnerCount: {
    fontSize: IS_IPAD ? 16 : 12,
    color: '#6b7280',
    fontWeight: '600',
    paddingBottom: IS_IPAD ? 3 : 2,
  },
  partnerAddButton: {
    borderRadius: IS_IPAD ? 14 : 11,
    backgroundColor: Colors.primaryColor,
    paddingHorizontal: IS_IPAD ? 16 : 12,
    paddingVertical: IS_IPAD ? 8 : 6,
  },
  partnerAddButtonText: {
    fontSize: IS_IPAD ? 14 : 12,
    color: 'white',
    fontWeight: '700',
  },
  partnerList: {
    gap: IS_IPAD ? 14 : 10,
  },
  partnerCard: {
    backgroundColor: '#ffffff',
    borderRadius: IS_IPAD ? 18 : 14,
    borderWidth: 1,
    borderColor: '#ececec',
    padding: IS_IPAD ? 24 : 16,
  },
  partnerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: IS_IPAD ? 18 : 14,
  },
  partnerTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  partnerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: IS_IPAD ? 8 : 6,
    marginLeft: IS_IPAD ? 12 : 8,
  },
  partnerActionButton: {
    borderRadius: IS_IPAD ? 14 : 11,
    backgroundColor: '#f4f4f5',
    paddingHorizontal: IS_IPAD ? 14 : 10,
    paddingVertical: IS_IPAD ? 8 : 6,
  },
  partnerDeleteButton: {
    backgroundColor: '#fff1f1',
  },
  partnerActionText: {
    fontSize: IS_IPAD ? 14 : 11,
    color: '#3f3f46',
    fontWeight: '700',
  },
  partnerDeleteText: {
    color: '#d92d20',
  },
  partnerName: {
    fontSize: IS_IPAD ? 21 : 16,
    fontWeight: '700',
    color: '#1d1d1f',
    marginBottom: IS_IPAD ? 4 : 2,
  },
  partnerMeta: {
    fontSize: IS_IPAD ? 15 : 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  partnerInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: IS_IPAD ? 12 : 8,
  },
  partnerInfoItem: {
    width: '48%',
    backgroundColor: '#fafafa',
    borderRadius: IS_IPAD ? 14 : 10,
    borderWidth: 1,
    borderColor: '#f1f1f1',
    paddingHorizontal: IS_IPAD ? 16 : 12,
    paddingVertical: IS_IPAD ? 14 : 10,
  },
  partnerInfoLabel: {
    fontSize: IS_IPAD ? 14 : 11,
    color: '#8e8e93',
    fontWeight: '600',
    marginBottom: IS_IPAD ? 6 : 4,
  },
  partnerInfoValue: {
    fontSize: IS_IPAD ? 16 : 12,
    color: '#1d1d1f',
    fontWeight: '600',
  },
  emptyPartnerCard: {
    backgroundColor: '#ffffff',
    borderRadius: IS_IPAD ? 18 : 14,
    borderWidth: 1,
    borderColor: '#ececec',
    paddingHorizontal: IS_IPAD ? 24 : 18,
    paddingVertical: IS_IPAD ? 28 : 22,
  },
  emptyPartnerTitle: {
    fontSize: IS_IPAD ? 18 : 14,
    color: '#1d1d1f',
    fontWeight: '700',
    marginBottom: IS_IPAD ? 8 : 6,
  },
  emptyPartnerText: {
    fontSize: IS_IPAD ? 15 : 12,
    color: '#6b7280',
    lineHeight: IS_IPAD ? 22 : 18,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: IS_IPAD ? 16 : 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: IS_IPAD ? 18 : 14,
    color: '#8e8e93',
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  infoValue: {
    fontSize: IS_IPAD ? 20 : 16,
    color: '#1d1d1f',
    fontWeight: '400',
    letterSpacing: -0.3,
  },
  infoValueEmpty: {
    color: '#c7c7cc',
    fontStyle: 'normal',
    fontWeight: '400',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
  },
  genderButtonActive: {
    backgroundColor: Colors.primaryColor,
    borderColor: Colors.primaryColor,
  },
  genderButtonText: {
    fontSize: 14,
    color: '#666',
  },
  genderButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  calendarContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  calendarButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
  },
  calendarButtonActive: {
    backgroundColor: Colors.primaryColor,
    borderColor: Colors.primaryColor,
  },
  calendarButtonText: {
    fontSize: 14,
    color: '#666',
  },
  calendarButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  leapMonthContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  leapMonthButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
  },
  leapMonthButtonActive: {
    backgroundColor: Colors.primaryColor,
    borderColor: Colors.primaryColor,
  },
  leapMonthButtonText: {
    fontSize: 14,
    color: '#666',
  },
  leapMonthButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.primaryColor,
    borderColor: Colors.primaryColor,
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  timeSection: {
    flex: 1,
  },
  timeUnknownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  timeUnknownText: {
    fontSize: 16,
    color: '#333',
  },
  dateSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  dateSelectorText: {
    fontSize: 16,
    color: '#333',
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
    minWidth: 120,
  },
  timeSelectorText: {
    fontSize: 16,
    color: '#333',
  },
  timeDisabledText: {
    fontSize: 16,
    color: '#999',
  },
  arrowIcon: {
    fontSize: 18,
    color: '#ccc',
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: IS_IPAD ? 24 : (Platform.OS === 'android' ? 10 : 20),
    gap: IS_IPAD ? 16 : 12,
    paddingBottom: IS_IPAD ? 40 : 30,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: IS_IPAD ? 18 : 12,
    borderRadius: IS_IPAD ? 12 : 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: IS_IPAD ? 20 : 16,
    color: '#666',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: IS_IPAD ? 18 : 12,
    borderRadius: IS_IPAD ? 12 : 8,
    backgroundColor: Colors.primaryColor,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: IS_IPAD ? 20 : 16,
    color: 'white',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: IS_IPAD ? 24 : 16,
    padding: IS_IPAD ? 30 : 20,
    width: IS_IPAD ? '70%' : '90%',
    maxWidth: IS_IPAD ? 600 : '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: IS_IPAD ? 28 : 20,
  },
  modalTitle: {
    fontSize: IS_IPAD ? 24 : 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    width: IS_IPAD ? 40 : 32,
    height: IS_IPAD ? 40 : 32,
    borderRadius: IS_IPAD ? 20 : 16,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: IS_IPAD ? 24 : 18,
    color: '#666',
    fontWeight: 'bold',
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: IS_IPAD ? 28 : 20,
  },
  pickerColumn: {
    alignItems: 'center',
    flex: 1,
  },
  pickerLabel: {
    fontSize: IS_IPAD ? 20 : 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: IS_IPAD ? 14 : 10,
  },
  pickerScroll: {
    maxHeight: IS_IPAD ? 280 : 200,
  },
  pickerItem: {
    paddingVertical: IS_IPAD ? 16 : 12,
    paddingHorizontal: IS_IPAD ? 20 : 16,
    borderRadius: IS_IPAD ? 12 : 8,
    marginVertical: IS_IPAD ? 6 : 4,
    minWidth: IS_IPAD ? 80 : 60,
    alignItems: 'center',
    height: IS_IPAD ? 64 : 48,
  },
  pickerItemSelected: {
    backgroundColor: Colors.primaryColor,
  },
  pickerItemText: {
    fontSize: IS_IPAD ? 20 : 16,
    color: '#333',
  },
  pickerItemTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  modalButton: {
    backgroundColor: Colors.primaryColor,
    paddingVertical: IS_IPAD ? 18 : 12,
    borderRadius: IS_IPAD ? 12 : 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: IS_IPAD ? 20 : 16,
    fontWeight: '600',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
});

export default SajuInfoScreen;
