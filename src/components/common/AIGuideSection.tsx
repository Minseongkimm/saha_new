import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { isIPad } from '../../utils/platform';

const IS_IPAD = isIPad();

interface AIGuideSectionProps {
  title: string;
  description: string;
  imageSource: any;
  style?: any;
}

const AIGuideSection: React.FC<AIGuideSectionProps> = ({
  title,
  description,
  imageSource,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <Image 
            source={imageSource} 
            style={styles.logo}
          />
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    paddingHorizontal: IS_IPAD ? 25 : 20,
    paddingVertical: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 0.5,
    borderWidth: 0.5,
    borderColor: '#f0f0f0',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: IS_IPAD ? 14 : 12,
    justifyContent: 'center',
  },
  icon: {
    width: IS_IPAD ? 48 : 32,
    height: IS_IPAD ? 48 : 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: IS_IPAD ? 4 : 2,
  },
  logo: {
    width: IS_IPAD ? 32 : 20,
    height: IS_IPAD ? 32 : 20,
  },
  title: {
    fontSize: IS_IPAD ? 22 : 16,
    fontWeight: '700',
    color: '#2c3e50',
    textAlign: 'center',
  },
  description: {
    fontSize: IS_IPAD ? 18 : 14,
    lineHeight: IS_IPAD ? 30 : 22,
    color: '#5a6c7d',
    marginBottom: IS_IPAD ? 20 : 16,
    textAlign: 'center',
  },
});

export default AIGuideSection;
