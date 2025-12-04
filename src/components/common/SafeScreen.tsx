import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SafeScreenProps {
  children: React.ReactNode;
  style?: object;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

const SafeScreen: React.FC<SafeScreenProps> = ({ 
  children, 
  style,
  edges = ['top', 'bottom'], // 기본적으로 상하단 Safe Area 적용
}) => {
  const insets = useSafeAreaInsets();
  // Android에서 시스템 네비게이션 바 높이만큼 패딩 추가 (BottomTabNavigator와 동일)
  const bottomInset = Platform.OS === 'android' ? insets.bottom : 0;

  const paddingStyle = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? Math.max(0, bottomInset - 18) : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };

  return (
    <View style={[styles.container, paddingStyle, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default SafeScreen;

