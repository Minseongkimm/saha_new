import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { getStoreWebViewUri } from './storeWebViewConfig';

const NETWORK_WARMUP_TIMEOUT_MS = 2500;

const StoreWebViewNetworkWarmup: React.FC = () => {
  useEffect(() => {
    const warmupUrl = getStoreWebViewUri();
    if (!warmupUrl) return;

    let aborted = false;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      aborted = true;
      controller.abort();
    }, NETWORK_WARMUP_TIMEOUT_MS);

    // WebView 진입 직전에 도메인 연결을 한 번 열어 DNS/TLS 초기 비용을 낮춘다.
    fetch(warmupUrl, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'x-saha-webview-warmup': '1',
        'x-saha-platform': Platform.OS,
      },
    })
      .catch(() => {
        // 워밍업 실패는 기능 오류가 아니므로 무시한다.
      })
      .finally(() => {
        clearTimeout(timer);
      });

    return () => {
      if (!aborted) {
        controller.abort();
      }
      clearTimeout(timer);
    };
  }, []);

  return null;
};

export default StoreWebViewNetworkWarmup;
