import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { isIPad } from '../../utils/platform';

const IS_IPAD = isIPad();

interface ConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  cancelText?: string;
  confirmText: string;
  onConfirm: () => void;
  confirmButtonColor?: string;
  confirmDisabled?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  onClose,
  title,
  message,
  cancelText = '취소',
  confirmText,
  onConfirm,
  confirmButtonColor = Colors.primaryColor,
  confirmDisabled = false,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMessage}>{message}</Text>
          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: confirmButtonColor }]} 
              onPress={onClose}
            >
              <Text style={styles.modalCancelText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.modalConfirmButton,
                confirmDisabled && styles.modalButtonDisabled,
              ]}
              onPress={onConfirm}
              disabled={confirmDisabled}
            >
              <Text style={styles.modalConfirmText}>{confirmText}</Text>
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
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: IS_IPAD ? 40 : 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: IS_IPAD ? 500 : '100%',
    backgroundColor: 'white',
    borderRadius: IS_IPAD ? 20 : 14,
    paddingTop: IS_IPAD ? 40 : 32,
    paddingBottom: IS_IPAD ? 32 : 24,
    paddingHorizontal: IS_IPAD ? 40 : 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: IS_IPAD ? 28 : 22,
    fontWeight: '800',
    color: '#111',
    marginBottom: IS_IPAD ? 20 : 14,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: IS_IPAD ? 18 : 14,
    color: '#555',
    lineHeight: IS_IPAD ? 28 : 20,
    marginBottom: IS_IPAD ? 30 : 22,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: IS_IPAD ? 16 : 12,
  },
  modalButton: {
    flex: 1,
    paddingHorizontal: IS_IPAD ? 24 : 16,
    paddingVertical: IS_IPAD ? 20 : 16,
    borderRadius: IS_IPAD ? 14 : 10,
    marginHorizontal: IS_IPAD ? 6 : 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmButton: {
    backgroundColor: '#f1f3f5',
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalCancelText: {
    color: 'white',
    fontSize: IS_IPAD ? 20 : 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalConfirmText: {
    color: '#333',
    fontSize: IS_IPAD ? 20 : 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default ConfirmModal;

