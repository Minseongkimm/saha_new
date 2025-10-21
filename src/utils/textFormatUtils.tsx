import React from 'react';
import { Text } from 'react-native';
import { Colors } from '../constants/colors';

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
  
  // **굵은 글씨** 처리
  return text.split(/(\*\*.*?\*\*)/).map((part: string, index: number) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text 
          key={index} 
          style={{ 
            fontWeight: 'bold', 
            color: Colors.primaryColor 
          }}
        >
          {part.slice(2, -2)}
        </Text>
      );
    }
    return part;
  });
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
  
  // **마크 제거
  return text.replace(/\*\*/g, '');
};

