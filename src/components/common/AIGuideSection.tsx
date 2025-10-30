import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

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
    paddingHorizontal: 20,
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
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    justifyContent: 'center',
  },
  icon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  logo: {
    width: 20,
    height: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: '#5a6c7d',
    marginBottom: 16,
    textAlign: 'center',
  },
});

export default AIGuideSection;
