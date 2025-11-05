import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/colors';
import CustomHeader from '../common/CustomHeader';

interface BannerModalProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
}

const BannerModal: React.FC<BannerModalProps> = ({ visible, onClose, navigation }) => {
  const handleClose = () => {
    onClose();
  };

  const handleBannerImagePress = () => {
    onClose(); // 모달을 먼저 닫고
    navigation.navigate('BannerDetail'); // BannerDetailScreen으로 이동
  };

  const handleCloseForToday = async () => {
    try {
      // 오늘 날짜를 문자열로 저장
      const today = new Date().toDateString();
      await AsyncStorage.setItem('banner_closed_date', today);
      onClose();
    } catch (error) {
      console.error('Error saving banner close date:', error);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* 배너 이미지 */}
          <TouchableOpacity 
            style={styles.bannerContainer}
            onPress={handleBannerImagePress}
            activeOpacity={0.9}
          >
            <Image
              source={require('../../../assets/banner/modal_banner.png')}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          </TouchableOpacity>

          {/* 하단 버튼들 */}
          <View style={styles.bottomButtons}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={handleClose}
            >
              <Text style={styles.closeButtonText}>닫기</Text>
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity 
              style={styles.closeForTodayButton} 
              onPress={handleCloseForToday}
            >
              <Text style={styles.closeForTodayButtonText}>오늘 하루 닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 0.3,
  },
  bannerContainer: {
    width: '100%',
    aspectRatio: 16 / 9, // 16:9 비율 (일반적인 배너 비율)
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bottomButtons: {
    flexDirection: 'row',
    backgroundColor: 'white',
  },
  closeButton: {
    flex: 1,
    backgroundColor: 'white',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  closeForTodayButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeForTodayButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default BannerModal;
