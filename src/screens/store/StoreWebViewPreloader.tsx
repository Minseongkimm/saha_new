import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import {
  ANDROID_APP_USER_AGENT,
  WEBVIEW_APP_UA_SUFFIX,
  getStoreWebViewUri,
} from './storeWebViewConfig';

const StoreWebViewPreloader: React.FC = () => {
  const [enabled, setEnabled] = useState<boolean>(true);
  const preloadUri = useMemo(() => getStoreWebViewUri(), []);

  if (!enabled) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.hiddenContainer}>
      <WebView
        source={{ uri: preloadUri }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        setSupportMultipleWindows={false}
        applicationNameForUserAgent={WEBVIEW_APP_UA_SUFFIX}
        userAgent={Platform.OS === 'android' ? ANDROID_APP_USER_AGENT : undefined}
        onLoadEnd={() => setEnabled(false)}
        onError={() => setEnabled(false)}
        style={styles.hiddenWebView}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  hiddenContainer: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    top: -1000,
    left: -1000,
  },
  hiddenWebView: {
    width: 1,
    height: 1,
  },
});

export default StoreWebViewPreloader;
