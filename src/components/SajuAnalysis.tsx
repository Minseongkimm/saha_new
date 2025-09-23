import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '../constants/colors';

interface SajuAnalysisProps {
  analysis: {
    overall?: string;
    dayStem?: string;
    fiveElements?: string;
    sasin?: string;
    sinsal?: string;
    comprehensiveAdvice?: string;
    generatedAt?: string;
    llmModel?: string;
  };
}

const SajuAnalysis: React.FC<SajuAnalysisProps> = ({ analysis }) => {
  const formatText = (text: string | undefined | null) => {
    // 안전성 검사: text가 없거나 빈 문자열인 경우 처리
    if (!text || typeof text !== 'string') {
      return '해당 내용을 불러올 수 없습니다.';
    }
    
    // **굵은 글씨** 처리
    return text.split(/(\*\*.*?\*\*)/).map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <Text key={index} style={styles.boldText}>
            {part.slice(2, -2)}
          </Text>
        );
      }
      return part;
    });
  };

  const renderSection = (title: string, content: string | undefined | null) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionContent}>
        {formatText(content)}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderSection('전체적인 풀이', analysis.overall)}
        {renderSection('일간 풀이', analysis.dayStem)}
        {renderSection('오행 균형', analysis.fiveElements)}
        {renderSection('십성 구조', analysis.sasin)}
        {renderSection('신살 해석', analysis.sinsal)}
        {renderSection('종합 조언', analysis.comprehensiveAdvice)}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  section: {
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primaryColor,
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
  },
  boldText: {
    fontWeight: 'bold',
    color: Colors.primaryColor,
  },
});

export default SajuAnalysis;
