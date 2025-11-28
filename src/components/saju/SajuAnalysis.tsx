import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '../../constants/colors';
import { formatBoldText } from '../../utils/text/textFormatUtils';
import { isIPad } from '../../utils/platform';

const IS_IPAD = isIPad();

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
    marginBottom: IS_IPAD ? 24 : 15,
    paddingHorizontal: IS_IPAD ? 20 : 10,
  },
  sectionTitle: {
    fontSize: IS_IPAD ? 24 : 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: IS_IPAD ? 12 : 8,
    marginTop: IS_IPAD ? 12 : 8,
  },
  sectionContent: {
    fontSize: IS_IPAD ? 20 : 14,
    lineHeight: IS_IPAD ? 34 : 22,
    color: '#333',
  },
});

export default SajuAnalysis;
