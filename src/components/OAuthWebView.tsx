import React, { useRef } from 'react';
import { Modal, View, TouchableOpacity, Text, StyleSheet, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';

interface OAuthWebViewProps {
  visible: boolean;
  url: string;
  onClose: () => void;
  onSuccess: (url: string) => void;
}

const OAuthWebView: React.FC<OAuthWebViewProps> = ({
  visible,
  url,
  onClose,
  onSuccess
}) => {
  const webViewRef = useRef<WebView>(null);

  const handleNavigationStateChange = (navState: any) => {
    // 딥링크 URL을 감지하면 성공 처리
    if (navState.url.includes('saha://auth/callback')) {
      console.log('✅ === 딥링크 감지됨! ===', navState.url);
      onSuccess(navState.url);
      return;
    }
    
    // Supabase 콜백 URL을 감지하면 처리
    if (navState.url.includes('tdzkgyixpthhzzcfnotu.supabase.co/auth/v1/callback')) {
      console.log('🔄 === Supabase 콜백 감지 ===', navState.url);
      
      // 에러가 있는 경우 즉시 처리
      if (navState.url.includes('error=')) {
        console.log('❌ === Supabase 에러 감지 ===');
        onSuccess(navState.url);
        return;
      }
      
      // URL에서 code 파라미터 확인
      if (navState.url.includes('code=')) {
        console.log('✅ === OAuth 인증 코드 수신 완료 ===');
        
        // 즉시 콜백 실행 (토큰 교환은 LoginScreen에서 처리)
        console.log('⏰ === OAuth 코드 수신, 즉시 콜백 실행 ===');
        onSuccess(navState.url);
        
        return; // 추가 네비게이션 방지
      }
    }
  };

  const handleError = (error: any) => {
    console.error('❌ === WebView 에러 ===', error);
  };

  const handleLoadStart = () => {
    // 로딩 로그 제거 (필요시 주석 해제)
    // console.log('🔄 === WebView 로딩 시작 ===');
  };

  const handleLoadEnd = () => {
    // 로딩 로그 제거 (필요시 주석 해제)
    // console.log('✅ === WebView 로딩 완료 ===');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕ 닫기</Text>
          </TouchableOpacity>
          <Text style={styles.title}>카카오 로그인</Text>
          <View style={styles.placeholder} />
        </View>
        
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          onNavigationStateChange={handleNavigationStateChange}
          onError={handleError}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  placeholder: {
    width: 60, // closeButton과 같은 크기
  },
  webview: {
    flex: 1,
  },
});

export default OAuthWebView;
