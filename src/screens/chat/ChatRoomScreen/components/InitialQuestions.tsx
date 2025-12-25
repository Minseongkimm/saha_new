/**
 * InitialQuestions - 초기 질문 컴포넌트
 * 채팅방 입장 시 표시되는 초기 질문 버튼들
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { 
  INITIAL_QUESTIONS, 
  INITIAL_QUESTIONS_BY_EXPERT
} from '../../../../services/chat/initialQuestions';
import { isIPad } from '../../../../utils/platform';

const IS_IPAD = isIPad();

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
  
  const questionsByExpert = INITIAL_QUESTIONS_BY_EXPERT;
  const questionsByCategory = INITIAL_QUESTIONS;
  
  // expert.name으로 먼저 찾고, 없으면 category로 폴백
  const initialQuestions = questionsByExpert[expert.name] 
    || questionsByCategory[expert.category as keyof typeof questionsByCategory];
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
    paddingHorizontal: IS_IPAD ? 24 : 16,
    paddingTop: IS_IPAD ? 24 : 16,
    paddingBottom: IS_IPAD ? 18 : 12,
  },
  initialQuestionsTitle: {
    fontSize: IS_IPAD ? 18 : 14,
    color: '#333',
    marginBottom: IS_IPAD ? 16 : 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  initialQuestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: IS_IPAD ? 12 : 8,
  },
  initialQuestionButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: IS_IPAD ? 12 : 8,
    paddingHorizontal: IS_IPAD ? 18 : 12,
    paddingVertical: IS_IPAD ? 16 : 10,
    width: '48%',
    minHeight: IS_IPAD ? 60 : 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  initialQuestionButtonText: {
    color: '#333',
    fontSize: IS_IPAD ? 16 : 12,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: IS_IPAD ? 22 : 16,
  },
});

export default InitialQuestions;
