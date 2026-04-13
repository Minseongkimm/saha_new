import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Colors } from '../../../constants/colors';
import { isIPad } from '../../../utils/platform';

const IS_IPAD = isIPad();

export const STORE_CATEGORIES = [
  { key: 'all', label: '전체' },
  { key: 'saju_report', label: '사주 리포트' },
] as const;

export type StoreCategoryKey = (typeof STORE_CATEGORIES)[number]['key'];

interface StoreCategoryChipsProps {
  selectedCategory: StoreCategoryKey;
  onCategoryPress: (category: StoreCategoryKey) => void;
}

const StoreCategoryChips: React.FC<StoreCategoryChipsProps> = ({
  selectedCategory,
  onCategoryPress,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.chipContainer}>
        {STORE_CATEGORIES.map((category) => {
          const isSelected = selectedCategory === category.key;
          return (
            <TouchableOpacity
              key={category.key}
              style={[styles.chip, isSelected && styles.selectedChip]}
              onPress={() => onCategoryPress(category.key)}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.chipText, isSelected && styles.selectedChipText]}
                numberOfLines={1}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: IS_IPAD ? 20 : 10,
    marginBottom: IS_IPAD ? 25 : 15,
    paddingHorizontal: 0,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'space-between',
    gap: IS_IPAD ? 12 : 6,
  },
  chip: {
    flex: 1,
    paddingHorizontal: IS_IPAD ? 16 : 10,
    paddingVertical: Platform.OS === 'android' ? 7 : IS_IPAD ? 16 : 8,
    borderRadius: IS_IPAD ? 16 : 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 0,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  selectedChip: {
    backgroundColor: Colors.primaryColor,
    shadowColor: Colors.primaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  chipText: {
    fontSize: IS_IPAD ? 18 : 11,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  selectedChipText: {
    color: 'white',
    fontWeight: '700',
    letterSpacing: 0,
  },
});

export default StoreCategoryChips;
