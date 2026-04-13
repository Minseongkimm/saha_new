import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageSourcePropType,
  Dimensions,
} from 'react-native';
import { Colors } from '../../../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = Math.round(
  Math.min(120, Math.max(72, SCREEN_WIDTH * 0.28))
);

export interface StoreProductCardProps {
  imageSource: ImageSourcePropType;
  title: string;
  subtitle?: string;
  description?: string;
  priceInSaba: number;
  onPress?: () => void;
}

const StoreProductCard: React.FC<StoreProductCardProps> = ({
  imageSource,
  title,
  subtitle,
  description,
  priceInSaba,
  onPress,
}) => {
  const content = (
    <View style={styles.container}>
      <View style={styles.imageWrap}>
        <Image source={imageSource} style={styles.image} resizeMode="cover" />
      </View>
      <View style={styles.content}>
        <View style={styles.subtitleRow}>
          {subtitle ? (
            <View style={styles.categoryChip}>
              <Text style={styles.categoryChipText} numberOfLines={1}>
                {subtitle}
              </Text>
            </View>
          ) : null}
          <View style={styles.priceChip}>
            <Text style={styles.priceChipText}>{priceInSaba} 사바</Text>
          </View>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {description ? (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    overflow: 'hidden',
    height: IMAGE_SIZE,
  },
  imageWrap: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  },
  content: {
    flex: 1,
    height: IMAGE_SIZE,
    paddingVertical: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  categoryChip: {
    backgroundColor: '#EEEEEE',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primaryColor,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
    textAlign: 'right',
  },
  description: {
    fontSize: 13,
    color: '#616161',
    lineHeight: 18,
    textAlign: 'right',
  },
  priceChip: {
    marginLeft: 6,
    backgroundColor: Colors.primaryColor,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priceChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default StoreProductCard;
