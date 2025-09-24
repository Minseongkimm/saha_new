import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import { Colors } from '../constants/colors';

interface ChatStartBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onStartChat: () => void;
  title?: string;
  description?: string;
  buttonText?: string;
}

const { width, height } = Dimensions.get('window');

const ChatStartBottomSheet: React.FC<ChatStartBottomSheetProps> = ({
  visible,
  onClose,
  onStartChat,
  title = "AI 도사와 이야기 나누기",
  description = "궁금한 점이나 더 자세한 해석이 필요하시다면 AI 도사와 1:1 대화를 통해 맞춤형 조언을 받아보세요.",
  buttonText = "이야기 나누기"
}) => {
  const translateY = React.useRef(new Animated.Value(height)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      // 초기값 설정 (화면 아래에서 시작)
      translateY.setValue(height);
      fadeAnim.setValue(0);
      
      // 밑에서 스르륵 올라오는 애니메이션
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      // 아래로 스르륵 내려가는 애니메이션
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: height,
          duration: 180,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible]);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return gestureState.dy > 5;
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        translateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100 || gestureState.vy > 0.5) {
        onClose();
      } else {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity 
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View 
          style={[
            styles.bottomSheetContainer,
            { transform: [{ translateY }] }
          ]}
          {...panResponder.panHandlers}
        >
          {/* 바텀 시트 헤더 */}
          <View style={styles.bottomSheetHeader}>
            <View style={styles.dragHandle} />
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.bottomSheetContent}>
            {/* 로고와 제목 */}
            <View style={styles.headerSection}>
              <Image 
                source={require('../../assets/logo/logo_icon.png')} 
                style={styles.logo}
              />
              <Text style={styles.title}>{title}</Text>
            </View>
            
            <Text style={styles.description}>{description}</Text>
            
          </View>

          {/* 바텀 시트 버튼 */}
          <View style={styles.bottomSheetFooter}>
            <TouchableOpacity 
              style={styles.startButton}
              onPress={onStartChat}
            >
              <Text style={styles.startButtonText}>{buttonText}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  bottomSheetContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -5,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  bottomSheetHeader: {
    position: 'relative',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 16,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 13,
    color: '#888',
    fontWeight: 'bold',
  },
  bottomSheetContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 10,
  },
  logo: {
    width: 40,
    height: 40,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#5a6c7d',
    textAlign: 'center',
    marginBottom: 10,
  },
  bottomSheetFooter: {
    paddingHorizontal: 20,
    paddingTop: 0,
  },
  startButton: {
    backgroundColor: Colors.primaryColor,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChatStartBottomSheet;
