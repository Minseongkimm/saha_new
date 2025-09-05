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
import Icon from 'react-native-vector-icons/Ionicons';

interface CustomHeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  showLogo?: boolean;
}

const CustomHeader: React.FC<CustomHeaderProps> = ({
  title,
  showBackButton = true,
  onBackPress,
  showLogo = true,
}) => {
  return (
    <View style={styles.header}>
      {showBackButton ? (
        <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
          <Icon name="arrow-back" size={19} color={Colors.primaryColor} />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
      
      {showLogo ? (
        <Image
          source={require('../../assets/logo/logo_icon.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
      ) : (
        <Text style={styles.headerTitle}>{title}</Text>
      )}
      
      <View style={styles.placeholder} />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 0,
    paddingTop: Dimensions.get('window').height * 0.07,
    backgroundColor: 'white',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    marginLeft: 5,
  },
  headerLogo: {
    width: 40,
    height: 40,
    marginBottom: 7,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 50,
  },
});

export default CustomHeader;
