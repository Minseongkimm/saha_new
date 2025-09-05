import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  Animated,
} from 'react-native';
import { Colors } from '../constants/colors';

interface ExpertBottomSheetProps {
  isVisible: boolean;
  expert: {
    image: any;
    title: string;
    subtitle: string;
    description: string;
  } | null;
  onClose: () => void;
}

const ExpertBottomSheet: React.FC<ExpertBottomSheetProps> = ({ isVisible, expert, onClose }) => {
  if (!expert) return null;

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.contentContainer}>
          {/* 핸들 바 */}
          <View style={styles.handleBar} />
          
          {/* 도사 이미지 */}
          <Image source={expert.image} style={styles.expertImage} resizeMode="cover" />
          
          {/* 도사 정보 */}
          <View style={styles.expertInfo}>
            <Text style={styles.expertTitle}>{expert.title}</Text>
            <Text style={styles.expertSubtitle}>{expert.subtitle}</Text>
            <Text style={styles.expertDescription}>{expert.description}</Text>
          </View>

          {/* 상담 시작 버튼 */}
          <TouchableOpacity style={styles.consultButton} onPress={onClose}>
            <Text style={styles.consultButtonText}>상담 시작하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  contentContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    alignItems: 'center',
    minHeight: 400,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
    marginBottom: 20,
  },
  expertImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
  },
  expertInfo: {
    alignItems: 'center',
    marginBottom: 30,
  },
  expertTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  expertSubtitle: {
    fontSize: 16,
    color: Colors.primaryColor,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
  expertDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  consultButton: {
    backgroundColor: Colors.primaryColor,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    width: '100%',
  },
  consultButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default ExpertBottomSheet;
