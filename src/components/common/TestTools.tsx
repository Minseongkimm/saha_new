import React from 'react';
import { View, TouchableOpacity, Text, Alert, StyleSheet } from 'react-native';
import { supabase } from '../../utils/database/supabaseClient';
import { TodayFortuneCache } from '../../utils/today-fortune/todayFortuneCache';
import { SajuCache } from '../../utils/saju/sajuCache';
import { clearAllNewYearFortuneCache } from '../../utils/new-year-fortune/newYearFortuneCache';

export const TestTools: React.FC = () => {
  // 테스트용: 오늘의 운세 캐시 삭제
  const handleClearTodayFortuneCache = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      await TodayFortuneCache.clearTodayFortuneCache(user.id);
      Alert.alert('완료', '오늘의 운세 캐시가 삭제되었습니다.');
    } catch (error) {
      console.error('캐시 삭제 실패:', error);
      Alert.alert('오류', '캐시 삭제에 실패했습니다.');
    }
  };

  // 테스트용: 정통사주 캐시 삭제
  const handleClearTraditionalSajuCache = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      await SajuCache.clearUserCache(user.id);
      Alert.alert('완료', '정통사주 캐시가 삭제되었습니다.');
    } catch (error) {
      console.error('캐시 삭제 실패:', error);
      Alert.alert('오류', '캐시 삭제에 실패했습니다.');
    }
  };

  // 테스트용: 신년운세 캐시 삭제
  const handleClearNewYearFortuneCache = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      await clearAllNewYearFortuneCache(user.id);
      Alert.alert('완료', '신년운세 캐시가 삭제되었습니다.');
    } catch (error) {
      console.error('캐시 삭제 실패:', error);
      Alert.alert('오류', '캐시 삭제에 실패했습니다.');
    }
  };

  // 테스트용: 오늘의 운세 DB 삭제
  const handleDeleteDailyFortuneDB = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      const { error } = await supabase
        .from('saju_analyses')
        .update({ daily_fortune: null })
        .eq('user_id', user.id);

      if (error) throw error;
      Alert.alert('완료', '오늘의 운세 DB 데이터가 삭제되었습니다.');
    } catch (error) {
      console.error('DB 삭제 실패:', error);
      Alert.alert('오류', 'DB 삭제 실패');
    }
  };

  // 테스트용: 정통 사주 DB 삭제
  const handleDeleteTraditionalSajuDB = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      const { error } = await supabase
        .from('saju_analyses')
        .update({ traditional_analysis: null })
        .eq('user_id', user.id);

      if (error) throw error;
      Alert.alert('완료', '정통 사주 DB 데이터가 삭제되었습니다.');
    } catch (error) {
      console.error('DB 삭제 실패:', error);
      Alert.alert('오류', 'DB 삭제 실패');
    }
  };

  // 테스트용: 신년 운세 DB 삭제
  const handleDeleteNewYearFortuneDB = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      const { error } = await supabase
        .from('saju_analyses')
        .update({ new_year_fortune: null })
        .eq('user_id', user.id);

      if (error) throw error;
      Alert.alert('완료', '신년 운세 DB 데이터가 삭제되었습니다.');
    } catch (error) {
      console.error('DB 삭제 실패:', error);
      Alert.alert('오류', 'DB 삭제 실패');
    }
  };

  return (
    <View>
      {/* 캐시 삭제 버튼들 */}
      <View style={styles.testButtonContainer}>
        <TouchableOpacity
          style={styles.testButton}
          onPress={handleClearTodayFortuneCache}
          activeOpacity={0.7}
        >
          <Text style={styles.testButtonText}>오늘운세 캐시삭제</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.testButton}
          onPress={handleClearTraditionalSajuCache}
          activeOpacity={0.7}
        >
          <Text style={styles.testButtonText}>정통사주 캐시삭제</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.testButton}
          onPress={handleClearNewYearFortuneCache}
          activeOpacity={0.7}
        >
          <Text style={styles.testButtonText}>신년운세 캐시삭제</Text>
        </TouchableOpacity>
      </View>
      
      {/* DB 삭제 버튼들 */}
      <View style={[styles.testButtonContainer, { marginTop: 0 }]}>
        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: '#333' }]}
          onPress={handleDeleteDailyFortuneDB}
          activeOpacity={0.7}
        >
          <Text style={styles.testButtonText}>오늘운세 DB삭제</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: '#333' }]}
          onPress={handleDeleteTraditionalSajuDB}
          activeOpacity={0.7}
        >
          <Text style={styles.testButtonText}>정통사주 DB삭제</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: '#333' }]}
          onPress={handleDeleteNewYearFortuneDB}
          activeOpacity={0.7}
        >
          <Text style={styles.testButtonText}>신년운세 DB삭제</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  testButtonContainer: {
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 15,
    flexDirection: 'row',
    gap: 8,
  },
  testButton: {
    flex: 1,
    backgroundColor: '#FF6B6B',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});

