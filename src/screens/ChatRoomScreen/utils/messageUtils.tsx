/**
 * messageUtils - 메시지 관련 유틸리티 함수들
 * **볼드** 마크다운 처리, 팔로업 질문 추출/제거 등 메시지 텍스트 처리
 */
import React from 'react';
import { Text } from 'react-native';
import { removeBoldMarkup } from '../../../utils/removeBoldMarkup';
import { Colors } from '../../../constants/colors';

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
  const followUpQuestions: string[] = [];
  
  // 형식 1: "팔로업 질문:" 형식 (4개)
  const format1Regex = /팔로업\s*질문:\s*\n\s*1\.\s*([^\n]+)\s*\n\s*2\.\s*([^\n]+)\s*\n\s*3\.\s*([^\n]+)\s*\n\s*4\.\s*([^\n]+)/;
  const format1Match = text.match(format1Regex);
  
  // 형식 2: "다음으로 궁금하신 점은 무엇인지요?" 형식 (4개)
  const format2Regex = /다음으로\s*궁금하신\s*점은\s*무엇인지요\?[\s\S]*?1\.\s*([^\n]+)[\s\S]*?2\.\s*([^\n]+)[\s\S]*?3\.\s*([^\n]+)[\s\S]*?4\.\s*([^\n]+)/;
  const format2Match = text.match(format2Regex);
  
  // 형식 3: 단순히 1. 2. 3. 4. 형식
  const format3Regex = /1\.\s*([^\n]+)[\s\S]*?2\.\s*([^\n]+)[\s\S]*?3\.\s*([^\n]+)[\s\S]*?4\.\s*([^\n]+)/;
  const format3Match = text.match(format3Regex);

  if (format1Match && format1Match[1] && format1Match[2] && format1Match[3] && format1Match[4]) {
    followUpQuestions.push(
      removeBoldMarkup(format1Match[1].trim()), 
      removeBoldMarkup(format1Match[2].trim()), 
      removeBoldMarkup(format1Match[3].trim()), 
      removeBoldMarkup(format1Match[4].trim())
    );
  } else if (format2Match && format2Match[1] && format2Match[2] && format2Match[3] && format2Match[4]) {
    followUpQuestions.push(
      removeBoldMarkup(format2Match[1].trim()), 
      removeBoldMarkup(format2Match[2].trim()), 
      removeBoldMarkup(format2Match[3].trim()), 
      removeBoldMarkup(format2Match[4].trim())
    );
  } else if (format3Match && format3Match[1] && format3Match[2] && format3Match[3] && format3Match[4]) {
    followUpQuestions.push(
      removeBoldMarkup(format3Match[1].trim()), 
      removeBoldMarkup(format3Match[2].trim()), 
      removeBoldMarkup(format3Match[3].trim()), 
      removeBoldMarkup(format3Match[4].trim())
    );
  }
  
  return followUpQuestions;
};

// 팔로업 질문 제거 함수
export const removeFollowUpQuestionsFromText = (text: string): string => {
  let cleanText = text;
  
  // 형식 1 제거
  cleanText = cleanText.replace(/팔로업\s*질문:[\s\S]*$/, '').trim();
  
  // 형식 2 제거
  cleanText = cleanText.replace(/다음으로\s*궁금하신\s*점은\s*무엇인지요\?[\s\S]*$/, '').trim();
  
  // 형식 3 제거 (끝부분의 1. 2. 3. 4. 패턴)
  cleanText = cleanText.replace(/\n\s*1\.\s*[^\n]+[\s\S]*?4\.\s*[^\n]+[\s\S]*$/, '').trim();
  
  return cleanText;
};
