import React from 'react';
import { View, StyleSheet } from 'react-native';
import SabaLoader from './SabaLoader';

interface SajuAnalysisLoaderProps {
  message: string;
  visible?: boolean; // 표시 여부
}

const SajuAnalysisLoader: React.FC<SajuAnalysisLoaderProps> = ({
  message,
  visible = true,
}) => {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <SabaLoader
        size={32}
        message={message}
        containerStyle={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}
        textStyle={{ marginTop: 0, marginLeft: 8, color: '#666666', fontWeight: '500' }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SajuAnalysisLoader;

