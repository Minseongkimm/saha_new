/**
 * ExpertCard
 * AI 사주 도사 카드 컴포넌트

 * 주요 기능:
 * 1. 도사 이미지 표시
 * 2. 도사 이름 표시
 * 3. 전문 분야 태그 표시 (specialty_tags)
 * 4. 도사의 한마디 표시 (expert_quote) - 도사 말투로 된 인상적인 문구
 * 5. 시그니처 문구 표시 (signature_phrase) - 도사의 특징을 나타내는 간단한 문구
 */

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
import { getExpertImage } from '../utils/getExpertImage';

interface ExpertCardProps {
  expert: Expert;
  onPress: (expert: Expert) => void;
}

const ExpertCard: React.FC<ExpertCardProps> = ({ expert, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(expert)}
      activeOpacity={0.8}
    >
      {/* 도사 이미지 영역 */}
      <View style={styles.imageContainer}>
        <Image
          source={getExpertImage(expert.image_name)}
          style={styles.image}
          resizeMode="cover"
        />        
        {/* 배지 */}
        {expert.badge_type && (
          <View style={[
            styles.badge,
            expert.badge_type === 'popular' && styles.badgePopular,
            expert.badge_type === 'new' && styles.badgeNew,
            expert.badge_type === 'best' && styles.badgeBest,
          ]}>
            <Text style={styles.badgeText}>
              {expert.badge_type === 'popular' && '인기'}
              {expert.badge_type === 'new' && 'NEW'}
              {expert.badge_type === 'best' && 'BEST'}
            </Text>
          </View>
        )}
      </View>

      {/* 도사 정보 영역 */}
      <View style={styles.content}>
        {/* 도사 이름 */}
        <Text style={styles.title}>{expert.name}</Text>
        
        {/* 직함 (현재 미사용 - 전문분야 태그로 대체) */}
        {/* <Text style={styles.subtitle}>{expert.title}</Text> */}
        
        {/* 전문 분야 태그 (최대 2개만 표시) */}
        {expert.specialty_tags && expert.specialty_tags.length > 0 && (
          <View style={styles.specialtyTagsContainer}>
            {expert.specialty_tags.slice(0, 2).map((tag, index) => (
              <View key={index} style={styles.specialtyTag}>
                <Text style={styles.specialtyTagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
        
        {/* 도사의 한마디 - 말풍선 스타일 */}
        {expert.expert_quote && (
          <View style={styles.quoteContainer}>
            <Text style={styles.quoteText}>{expert.expert_quote}</Text>
          </View>
        )}
        
        {/* 시그니처 문구 - 도사의 특징을 나타내는 짧은 문구 */}
        {expert.signature_phrase && (
          <Text style={styles.signatureText}>{expert.signature_phrase}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

// 카드 크기 및 간격 계산
const cardWidth = (Dimensions.get('window').width - 50) / 2;

const styles = StyleSheet.create({
  card: {
    width: cardWidth,
    backgroundColor: 'white',
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
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
  statusOffline: {
    backgroundColor: '#9E9E9E',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  badgePopular: {
    backgroundColor: '#FF6B6B',
  },
  badgeNew: {
    backgroundColor: '#5F27CD',
  },
  badgeBest: {
    backgroundColor: '#FF9F43',
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  content: {
    paddingTop: 10,
    paddingLeft:4,
    paddingRight:3,
    
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
  specialtyTagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 3,
    marginBottom: 3,
  },
  specialtyTag: {
    backgroundColor: Colors.primaryColor + '0D',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginRight: 6,
    marginBottom: 4,
    borderWidth: 0.3,
    borderColor: Colors.primaryColor + '30',
  },
  specialtyTagText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.primaryColor,
    letterSpacing: -0.2,
  },
  quoteContainer: {
    backgroundColor: '#FAFAFA',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 6,
    marginBottom: 6,
    borderWidth: 0.5,
    borderColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.02,
    shadowRadius: 1,
    elevation: 1,
  },
  quoteText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4A4A4A',
    lineHeight: 19,
    letterSpacing: -0.1,
  },
  signatureText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#888',
    marginTop: 2,
  },
});

export default ExpertCard;
