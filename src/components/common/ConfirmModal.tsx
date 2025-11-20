import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '../../constants/colors';

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
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 14,
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
    marginBottom: 14,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 22,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 12,
  },
  modalButton: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 10,
    marginHorizontal: 4,
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
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalConfirmText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default ConfirmModal;

