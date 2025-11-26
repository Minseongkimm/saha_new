import React from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import SabaLoader from './SabaLoader';

interface PaymentLoadingModalProps {
  visible: boolean;
  message?: string;
}

const PaymentLoadingModal: React.FC<PaymentLoadingModalProps> = ({
  visible,
  message = '결제중입니다',
}) => {
  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      presentationStyle="overFullScreen"
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <SabaLoader
            message={message || '결제중입니다'}
            size={75}
            textStyle={styles.messageText}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    minWidth: 190,
  },
  messageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 25,
  },
});

export default PaymentLoadingModal;

