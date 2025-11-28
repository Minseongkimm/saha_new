import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Linking, Alert, ScrollView } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import CustomHeader from '../../components/common/CustomHeader';
import { safeGoBack } from '../../utils/navigation/safeGoBack';
import { isIPad } from '../../utils/platform';

const IS_IPAD = isIPad();

const SUPPORT_EMAIL: string = 'saha994959@gmail.com';
const EMAIL_SUBJECT: string = '사바 고객 문의';
const EMAIL_BODY_TEMPLATE: string = '안녕하세요 사바관련 문의 드립니다.\n\n문의 유형: \n\n상세 내용: \n\n발생 일시: \n\n첨부 자료: \n\n이메일 (간편 로그인과 다른 주소일 때만): \n\n앱 버전: 1.0.0\n';

type ContactSupportScreenProps = StackScreenProps<RootStackParamList, 'ContactSupport'>;

const ContactSupportScreen: React.FC<ContactSupportScreenProps> = ({ navigation }) => {
  const handlePressBack = () => {
    safeGoBack(navigation);
  };
  const handlePressEmail = async () => {
    const encodedBody: string = encodeURIComponent(EMAIL_BODY_TEMPLATE);
    const mailtoUrl: string = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodedBody}`;
    const canOpen: boolean = await Linking.canOpenURL(mailtoUrl);
    if (!canOpen) {
      Alert.alert('안내', '이 기기에서 이메일 앱을 열 수 없습니다.');
      return;
    }
    try {
      await Linking.openURL(mailtoUrl);
    } catch (error) {
      Alert.alert('안내', '이메일 앱 실행에 실패했습니다. 다시 시도해 주세요.');
    }
  };
  return (
    <View style={styles.container}>
      <CustomHeader title="고객 지원" onBackPress={handlePressBack} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.title}>무엇을 도와드릴까요?</Text>
          <Text style={styles.subtitle}>정확하고 빠른 답변을 위해 아래 안내를 참고해 주세요.</Text>
        </View>
        <View style={styles.callout}>
          <Text style={styles.calloutTitle}>문의 전송 전에 확인해 주세요</Text>
          <View style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>문의 목적을 알려 주시면 더 정확하게 살펴볼 수 있어요.</Text>
          </View>
          <View style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>어느 화면에서 어떤 경험을 하셨는지 공유해 주시면 큰 도움이 돼요.</Text>
          </View>
          <View style={[styles.bulletRow]}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>오류 메시지, 스크린샷을 보내 주시면 확인이 빨라져요.</Text>
          </View>
          <View style={[styles.bulletRow, styles.bulletRowLast]}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>간편 로그인 주소와 다른 메일로 보낸다면 그 주소를 함께 알려 주세요.</Text>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>함께 적어 주시면 좋아요</Text>
          <View style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>사용 중인 기기와 OS 버전</Text>
          </View>
          <View style={[styles.bulletRow, styles.bulletRowLast]}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>앱 버전</Text>
          </View>
          
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>응답 안내</Text>
          <View style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.sectionBody}>접수시간 :평일 10~18시(24시간 이내 답변)</Text>
          </View>
          <View style={[styles.bulletRow, styles.bulletRowLast]}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.sectionBody}>문의 메일 : {SUPPORT_EMAIL}</Text>
          </View>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.emailButton} onPress={handlePressEmail}>
          <Text style={styles.emailButtonText}>이메일로 문의하기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: IS_IPAD ? 30 : 20,
    paddingTop: IS_IPAD ? 32 : 24,
    paddingBottom: IS_IPAD ? 40 : 32,
  },
  hero: {
    marginBottom: IS_IPAD ? 32 : 24,
  },
  subtitle: {
    fontSize: IS_IPAD ? 18 : 14,
    color: '#6B7280',
    lineHeight: IS_IPAD ? 26 : 20,
  },
  title: {
    fontSize: IS_IPAD ? 28 : 22,
    fontWeight: '700',
    color: '#222222',
    marginBottom: IS_IPAD ? 8 : 5,
  },
  description: {
    fontSize: IS_IPAD ? 19 : 15,
    color: '#555555',
    lineHeight: IS_IPAD ? 28 : 22,
  },
  callout: {
    paddingVertical: IS_IPAD ? 32 : 24,
    paddingHorizontal: IS_IPAD ? 28 : 20,
    backgroundColor: '#F7F9FC',
    borderRadius: IS_IPAD ? 18 : 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: IS_IPAD ? 32 : 24,
  },
  calloutTitle: {
    fontSize: IS_IPAD ? 20 : 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: IS_IPAD ? 20 : 16,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: IS_IPAD ? 16 : 12,
  },
  bulletRowLast: {
    marginBottom: 0,
  },
  bullet: {
    width: IS_IPAD ? 24 : 18,
    fontSize: IS_IPAD ? 20 : 16,
    lineHeight: IS_IPAD ? 28 : 22,
    color: '#1E293B',
  },
  bulletText: {
    flex: 1,
    fontSize: IS_IPAD ? 18 : 14,
    color: '#475569',
    lineHeight: IS_IPAD ? 28 : 22,
  },
  section: {
    paddingVertical: IS_IPAD ? 28 : 20,
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
  },
  sectionTitle: {
    fontSize: IS_IPAD ? 19 : 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: IS_IPAD ? 16 : 12,
  },
  sectionBody: {
    fontSize: IS_IPAD ? 18 : 14,
    color: '#475569',
    lineHeight: IS_IPAD ? 28 : 22,
  },
  footer: {
    paddingHorizontal: IS_IPAD ? 30 : 20,
    paddingBottom: IS_IPAD ? 40 : 32,
    paddingTop: IS_IPAD ? 24 : 16,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
    backgroundColor: '#FFFFFF',
  },
  footerDescription: {
    fontSize: IS_IPAD ? 17 : 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: IS_IPAD ? 20 : 16,
  },
  emailButton: {
    backgroundColor: Colors.primaryColor,
    paddingVertical: IS_IPAD ? 20 : 16,
    borderRadius: IS_IPAD ? 16 : 12,
    alignItems: 'center',
  },
  emailButtonText: {
    fontSize: IS_IPAD ? 20 : 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emailHint: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 12,
  },
});

export default ContactSupportScreen;

