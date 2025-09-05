import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Colors } from '../constants/colors';

interface CardProps {
  image: any;
  title: string;
  subtitle: string;
  description: string;
  onPress?: () => void;
}

const Card: React.FC<CardProps> = ({ image, title, subtitle, description, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Image source={image} style={styles.cardImage} resizeMode="cover" />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 2,
    marginVertical: 9,
    borderWidth: 0.5,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
    width: (Dimensions.get('window').width - 40) / 2,
    // shadow 관련 속성 모두 제거
  },
  cardImage: {
    width: '100%',
    height: 180,
  },
  cardContent: {
    padding: 16,
    paddingTop: 14,
    paddingBottom: 18,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: Colors.primaryColor,
    fontWeight: '500',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
});

export default Card;
