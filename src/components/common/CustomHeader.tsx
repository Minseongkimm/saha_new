import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../constants/colors';
import { isIPad } from '../../utils/platform';

const IS_IPAD = isIPad();

interface CustomHeaderProps {
  title: string;
  onBackPress: () => void;
  rightComponent?: React.ReactNode;
}

const CustomHeader: React.FC<CustomHeaderProps> = ({
  title,
  onBackPress,
  rightComponent,
}) => {
  const statusBarHeight = Platform.OS === 'android' 
    ? (StatusBar.currentHeight || 0) + 10 
    : (IS_IPAD ? 15 : 0);
  
  return (
    <>
      <StatusBar backgroundColor="white" barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, { paddingTop: statusBarHeight }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBackPress}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={IS_IPAD ? 32 : 24} color="#333" />
          </TouchableOpacity>
          
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          
          <View style={styles.rightContainer}>
            {rightComponent || <View style={styles.placeholder} />}
          </View>
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: 'white',
  },
  container: {
    minHeight: IS_IPAD ? 70 : 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'android' ? 8 : (IS_IPAD ? 12 : 0),
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  title: {
    flex: 1,
    fontSize: IS_IPAD ? 24 : 18,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  rightContainer: {
    width: 48,
    alignItems: 'flex-end',
  },
  placeholder: {
    width: 24,
    height: 24,
  },
});

export default CustomHeader;