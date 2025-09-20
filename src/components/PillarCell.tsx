import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { 
  getElementBackgroundColor,
  getElementTextColor,
  getElementWithKorean
} from '../constants/fiveElements';

interface PillarData {
  heavenly: string;
  earthly: string;
  korean: string;
  stemElement: string;
  branchElement: string;
}

interface PillarCellProps {
  pillarData: PillarData;
  tenGod?: string;
  branchSasin?: string;
  amjangan?: string;
  type: 'heavenly' | 'earthly';
}

const PillarCell: React.FC<PillarCellProps> = ({ 
  pillarData, 
  tenGod, 
  branchSasin, 
  amjangan, 
  type 
}) => {
  const isHeavenly = type === 'heavenly';
  const element = isHeavenly ? pillarData.stemElement : pillarData.branchElement;
  const character = isHeavenly ? pillarData.heavenly : pillarData.earthly;
  const backgroundColor = getElementBackgroundColor(element);
  const textColor = getElementTextColor(element);

  return (
    <View style={[styles.cell, isHeavenly ? styles.heavenlyCell : styles.earthlyCell, { backgroundColor }]}>
      <Text style={[styles.elementText, { color: textColor }]}>
        {getElementWithKorean(element)}
      </Text>
      <Text style={[styles.characterText, { color: textColor }]}>
        {character}
      </Text>
      <Text style={[styles.koreanText, { color: textColor }]}>
        {pillarData.korean || ''}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderRightColor: '#e0e0e0',
    borderBottomColor: '#e0e0e0',
    minHeight: 50,
  },
  heavenlyCell: {
    minHeight: 80,
  },
  earthlyCell: {
    minHeight: 80,
  },
  elementText: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  characterText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  koreanText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default PillarCell;
