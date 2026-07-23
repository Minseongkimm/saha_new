import React from 'react';
import { Text, TextStyle, Platform } from 'react-native';
import { Colors } from '../../constants/colors';
import { removeCommasFromMessage } from './removeCommas';
import { removeBoldMarkup } from './removeBoldMarkup';
import { isIPad } from '../platform';

const IS_IPAD = isIPad();

/**
 * **굵은 글씨** 마크다운을 파란색 볼드 텍스트로 변환
 * @param text - 마크다운이 포함된 텍스트
 * @returns React 엘리먼트 배열
 */
export const formatBoldText = (text: string | undefined | null): React.ReactNode => {
  // 안전성 검사: text가 없거나 빈 문자열인 경우 처리
  if (!text || typeof text !== 'string') {
    return '해당 내용을 불러올 수 없습니다.';
  }
  
  // 먼저 쉼표를 제거
  const textWithoutCommas = removeCommasFromMessage(text);
  
  // **굵은 글씨** 처리 (제목은 제외)
  const parts = textWithoutCommas.split(/(\*\*.*?\*\*)/).map((part: string, index: number) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text 
          key={index} 
          style={{ 
            fontWeight: Platform.OS === 'android' ? '700' : 'bold', 
            color: Colors.primaryColor 
          }}
        >
          {part.slice(2, -2)}
        </Text>
      );
    }
    return <Text key={index}>{part}</Text>;
  });
  
  return <>{parts}</>;
};

/**
 * **마크다운을 제거하고 일반 텍스트로 반환
 * @param text - 마크다운이 포함된 텍스트
 * @returns 일반 텍스트
 */
export const removeBoldMarks = (text: string | undefined | null): string => {
  // 안전성 검사: text가 없거나 빈 문자열인 경우 처리
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  // 먼저 쉼표를 제거
  const textWithoutCommas = removeCommasFromMessage(text);
  
  // **마크 제거
  return textWithoutCommas.replace(/\*\*/g, '');
};


export const renderHighlight = (text: string, key?: React.Key): React.ReactNode => {
  return (
    <Text key={key} style={highlightTextStyle}>
      {text}
    </Text>
  );
};

export const highlightTextStyle: TextStyle = {
  backgroundColor: 'rgba(255, 248, 240, 1.0)',
  paddingHorizontal: 6,
  paddingVertical: 3,
  borderRadius: 5,
  fontSize: IS_IPAD ? 21 : 13,
  fontWeight: '600',
  color: '#000000',
};

/**
 * 팔로업 질문 추출 함수
 * AI 응답에서 "팔로업 질문:" 또는 "다음으로 궁금하신 점은 무엇인지요?" 섹션에서 질문들을 추출
 */
export const extractFollowUpQuestions = (text: string): string[] => {
  const questions: string[] = [];
  if (!text) return questions;
  const sectionMatch1: RegExpMatchArray | null = text.match(/팔로업\s*질문:\s*([\s\S]*)$/);
  // 허용: "다음으로 궁금하신 점은 무엇인지요?" 변형(예: "금하신", "무엇인가요", 공백 변동)
  const sectionMatch2: RegExpMatchArray | null = text.match(/다음으로\s*(?:궁)?금하신\s*점(?:은|이)?\s*무엇(?:인지요|인가요|일까요)\??\s*([\s\S]*)$/);
  const section: string | null = sectionMatch1?.[1] ?? sectionMatch2?.[1] ?? null;
  if (!section) return questions;
  const lines = section
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const cleaned = removeBoldMarkup(
      line
        .replace(/^\s*(?:\d+[.)]|[-•*])\s*/, '')
        .replace(/^\[(.*)\]$/, '$1')
        .trim()
    );
    const isPlaceholder =
      cleaned === '...' ||
      cleaned === '질문' ||
      cleaned.includes('내외') ||
      cleaned.includes('짧은 질문');
    if (cleaned && !isPlaceholder && !cleaned.includes('팔로업 질문')) {
      questions.push(cleaned);
    }
  }
  return questions.slice(0, 2);
};

/**
 * 팔로업 질문 제거 함수
 * AI 응답 텍스트에서 팔로업 질문 섹션을 제거하여 메시지 본문만 남김
 */
export const removeFollowUpQuestionsFromText = (text: string): string => {
  let cleanText = text;
  
  // 형식 1 제거
  cleanText = cleanText.replace(/팔로업\s*질문:[\s\S]*$/, '').trim();
  
  // 형식 2 제거 (변형 허용)
  cleanText = cleanText.replace(/다음으로\s*(?:궁)?금하신\s*점(?:은|이)?\s*무엇(?:인지요|인가요|일까요)\??[\s\S]*$/, '').trim();
  
  return cleanText;
};
