import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { isIPad } from '../../utils/platform';

const IS_IPAD = isIPad();

interface SectionHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  style?: any;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  badge,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        {badge ? <Text style={styles.badge}>{badge}</Text> : null}
      </View>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: IS_IPAD ? 5 : 1,
  },
  title: {
    fontSize: IS_IPAD ? 24 : 16,
    fontWeight: '700',
    color: '#000',
  },
  badge: {
    fontSize: IS_IPAD ? 14 : 10,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: Colors.primaryColor,
    paddingHorizontal: IS_IPAD ? 10 : 6,
    paddingVertical: IS_IPAD ? 4 : 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  description: {
    fontSize: IS_IPAD ? 16 : 12,
    color: '#666',
    lineHeight: IS_IPAD ? 24 : 20,
  },
});

export default SectionHeader;
