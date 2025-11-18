import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '../../constants/colors';
import { formatBoldText } from '../../utils/text/textFormatUtils';

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

  const renderSection = (title: string, content: string | undefined | null) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionContent}>
        {formatBoldText(content)}
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
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    marginTop: 8,
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
  },
});

export default SajuAnalysis;
