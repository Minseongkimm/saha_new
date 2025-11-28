import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { isIPad } from '../../utils/platform';

const IS_IPAD = isIPad();

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
    paddingHorizontal: IS_IPAD ? 20 : 10
  },
  title: {
    fontSize: IS_IPAD ? 24 : 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: IS_IPAD ? 5 : 1,
  },
  description: {
    fontSize: IS_IPAD ? 16 : 12,
    color: '#666',
    lineHeight: IS_IPAD ? 24 : 20,
  },
});

export default SectionHeader;
