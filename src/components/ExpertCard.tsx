import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Expert } from '../types/expert';
import { Colors } from '../constants/colors';

interface ExpertCardProps {
  expert: Expert;
  onPress: (expert: Expert) => void;
}

const getExpertImage = (imageName: string) => {
  const images: { [key: string]: any } = {
    'hoosi_guy.jpg': require('../../assets/people/hoosi_guy.jpg'),
    'yeonhwa_girl.jpg': require('../../assets/people/yeonhwa_girl.jpg'),
    'cheongwang_guy.jpg': require('../../assets/people/cheongwang_guy.jpg'),
    'sangtong_guy.jpg': require('../../assets/people/sangtong_guy.jpg'),
  };
  return images[imageName];
};

const ExpertCard: React.FC<ExpertCardProps> = ({ expert, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(expert)}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        <Image
          source={getExpertImage(expert.image_name)}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={[styles.statusBadge, 
          expert.status === 'online' ? styles.statusOnline :
          expert.status === 'busy' ? styles.statusBusy :
          styles.statusOffline
        ]} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{expert.name}</Text>
        <Text style={styles.subtitle}>{expert.title}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {expert.description}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const cardWidth = (Dimensions.get('window').width - 45) / 2;

const styles = StyleSheet.create({
  card: {
    width: cardWidth,
    backgroundColor: 'white',
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: cardWidth,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  statusOnline: {
    backgroundColor: '#4CAF50',
  },
  statusBusy: {
    backgroundColor: '#FFC107',
  },
  statusOffline: {
    backgroundColor: '#9E9E9E',
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.primaryColor,
    marginBottom: 6,
  },
  description: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
});

export default ExpertCard;
