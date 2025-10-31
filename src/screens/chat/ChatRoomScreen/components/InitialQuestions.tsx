/**
 * InitialQuestions - 초기 질문 컴포넌트
 * 채팅방 입장 시 표시되는 초기 질문 버튼들
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { INITIAL_QUESTIONS, INITIAL_QUESTIONS_BY_EXPERT } from '../../../../services/chat/initialQuestions';

interface InitialQuestionsProps {
  expert: any;
  messages: any[];
  onSendMessage: (text: string) => void;
}

const InitialQuestions: React.FC<InitialQuestionsProps> = ({ expert, messages, onSendMessage }) => {
  // 초기 질문 옵션 표시 (인사말만 있을 때)
  if (messages.length !== 1) return null;
  const firstMessage = messages[0];
  if (firstMessage.sender_type !== 'expert') return null;
  
  // expert.name으로 먼저 찾고, 없으면 category로 폴백
  const initialQuestions = INITIAL_QUESTIONS_BY_EXPERT[expert.name] || INITIAL_QUESTIONS[expert.category as keyof typeof INITIAL_QUESTIONS];
  if (!initialQuestions?.length) return null;
  
  return (
    <View style={styles.initialQuestionsContainer}>
      <Text style={styles.initialQuestionsTitle}>궁금한 점을 선택해보세요</Text>
      <View style={styles.initialQuestionsGrid}>
        {initialQuestions.map((question: string, index: number) => (
          <TouchableOpacity
            key={index}
            style={styles.initialQuestionButton}
            onPress={async () => {
              await onSendMessage(question);
            }}
          >
            <Text style={styles.initialQuestionButtonText} numberOfLines={2}>
              {question}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  initialQuestionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  initialQuestionsTitle: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  initialQuestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  initialQuestionButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '48%',
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  initialQuestionButtonText: {
    color: '#333',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 16,
  },
});

export default InitialQuestions;
