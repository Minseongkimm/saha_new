import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SectionHeaderProps {
  title: string;
  description?: string;
  style?: any;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 5,
    marginBottom: 3,
    paddingHorizontal: 10
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 1,
  },
  description: {
    fontSize: 12,
    color: '#666',
    lineHeight: 20,
  },
});

export default SectionHeader;
