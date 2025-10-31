/**
 * messageUtils - 메시지 관련 유틸리티 함수들
 * **볼드** 마크다운 처리, 팔로업 질문 추출/제거 등 메시지 텍스트 처리
 */
import React from 'react';
import { Text } from 'react-native';
import { removeBoldMarkup } from '../../../../utils/text/removeBoldMarkup';
import { Colors } from '../../../../constants/colors';

// **text** 형태를 볼드 처리하는 함수
export const renderFormattedText = (text: string) => {
  if (!text) return '';
  
  const parts = text.split(/(\*\*.*?\*\*)/);
  
  return (
    <Text>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const boldText = part.slice(2, -2);
            return (
              <Text key={index} style={{ fontWeight: 'bold', color: Colors.primaryColor }}>
                {boldText}
              </Text>
            );
        }
        return part;
      })}
    </Text>
  );
};

// 팔로업 질문 추출 함수
export const extractFollowUpQuestions = (text: string): string[] => {
  const questions: string[] = [];
  if (!text) return questions;
  const sectionMatch1: RegExpMatchArray | null = text.match(/팔로업\s*질문:\s*([\s\S]*)$/);
  const sectionMatch2: RegExpMatchArray | null = text.match(/다음으로\s*궁금하신\s*점은\s*무엇인지요\?\s*([\s\S]*)$/);
  const section: string | null = sectionMatch1?.[1] ?? sectionMatch2?.[1] ?? null;
  if (!section) return questions;
  const itemRegex: RegExp = /^\s*\d+\.\s*(.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(section)) !== null) {
    const cleaned: string = removeBoldMarkup(match[1].trim());
    if (cleaned) questions.push(cleaned);
  }
  return questions.slice(0, 4);
};

// 팔로업 질문 제거 함수
export const removeFollowUpQuestionsFromText = (text: string): string => {
  let cleanText = text;
  
  // 형식 1 제거
  cleanText = cleanText.replace(/팔로업\s*질문:[\s\S]*$/, '').trim();
  
  // 형식 2 제거
  cleanText = cleanText.replace(/다음으로\s*궁금하신\s*점은\s*무엇인지요\?[\s\S]*$/, '').trim();
  
  return cleanText;
};
