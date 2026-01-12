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
  onSendMessage: (text: string, options?: { suppressUserBubble?: boolean }) => void;
}

const InitialQuestions: React.FC<InitialQuestionsProps> = ({ expert, messages, onSendMessage }) => {
  // 사용자 메시지가 하나도 없을 때만 노출
  const hasUserMessage = messages.some((m) => m?.sender_type === 'user');
  if (hasUserMessage) return null;
  // 환영/전문가 메시지가 없어도 표시
  
  const questionsByExpert = INITIAL_QUESTIONS_BY_EXPERT;
  const questionsByCategory = INITIAL_QUESTIONS;
  
  // category가 'main'이면 종합사주 기본 질문으로 매핑
  const categoryKey =
    (expert.category === 'main' ? 'comprehensive' : expert.category) as keyof typeof questionsByCategory;

  // expert.name 우선, 없으면 category, 그래도 없으면 종합사주 기본값
  const initialQuestions =
    questionsByExpert[expert.name] ||
    questionsByCategory[categoryKey] ||
    questionsByCategory['comprehensive'];
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
    paddingTop: 0,
    paddingBottom: IS_IPAD ? 18 : 12,
  },
  initialQuestionsTitle: {
    fontSize: IS_IPAD ? 18 : 14,
    color: '#333',
    marginBottom: IS_IPAD ? 12 : 8,
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
