/**
 * FollowUpQuestions - 팔로업 질문 컴포넌트
 * AI 응답 후 표시되는 추천 질문 버튼들
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { isIPad } from '../../../../utils/platform';

const IS_IPAD = isIPad();

interface FollowUpQuestionsProps {
  messages: any[];
  onSendMessage: (text: string) => void;
}

const FollowUpQuestions: React.FC<FollowUpQuestionsProps> = ({ messages, onSendMessage }) => {
  // 팔로업 질문이 있을 때만 표시
  if (messages.length <= 1) return null;
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage.follow_up_questions?.length) return null;
  
  return (
    <View style={styles.followUpContainer}>
      <Text style={styles.followUpTitle}>추천 질문</Text>
      <View style={styles.followUpButtonsRow}>
        {lastMessage.follow_up_questions.map((question: string, index: number) => (
          <TouchableOpacity
            key={index}
            style={styles.followUpButton}
            onPress={async () => {
              await onSendMessage(question);
            }}
          >
            <Text style={styles.followUpButtonText} numberOfLines={2}>
              {question}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  followUpContainer: {
    paddingHorizontal: IS_IPAD ? 24 : 16,
    paddingTop: IS_IPAD ? 12 : 8,
    paddingBottom: IS_IPAD ? 12 : 8,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  followUpTitle: {
    fontSize: IS_IPAD ? 14 : 10,
    color: '#999',
    marginBottom: IS_IPAD ? 10 : 6,
    fontWeight: '500',
  },
  followUpButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: IS_IPAD ? 12 : 8,
  },
  followUpButton: {
    backgroundColor: '#f0f0f5',
    borderRadius: IS_IPAD ? 10 : 6,
    paddingHorizontal: IS_IPAD ? 18 : 12,
    paddingVertical: IS_IPAD ? 14 : 10,
    width: '48%',
    minHeight: IS_IPAD ? 50 : 36,
    justifyContent: 'center',
  },
  followUpButtonText: {
    color: '#1a1a1a',
    fontSize: IS_IPAD ? 15 : 11,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: IS_IPAD ? 22 : 16,
  },
});

export default FollowUpQuestions;
