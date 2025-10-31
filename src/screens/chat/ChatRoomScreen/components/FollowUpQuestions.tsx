/**
 * FollowUpQuestions - 팔로업 질문 컴포넌트
 * AI 응답 후 표시되는 추천 질문 버튼들
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  followUpTitle: {
    fontSize: 10,
    color: '#999',
    marginBottom: 6,
    fontWeight: '500',
  },
  followUpButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  followUpButton: {
    backgroundColor: '#f0f0f5',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '48%',
    minHeight: 36,
    justifyContent: 'center',
  },
  followUpButtonText: {
    color: '#1a1a1a',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 16,
  },
});

export default FollowUpQuestions;
