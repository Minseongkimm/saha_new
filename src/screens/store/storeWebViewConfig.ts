import { Platform } from 'react-native';
import { STORE_WEBVIEW_URL, WEBVIEW_APP_UA_SUFFIX } from '../../config/env';

// 실기기 성능 측정 중에는 __DEV__에서도 배포 URL을 사용해 WebView fallback을 피한다.
const USE_DEPLOYED_STORE_WEBVIEW_IN_DEV = true;
export const ENABLE_STORE_WEBVIEW_PRELOAD = true;
export const ENABLE_STORE_WEBVIEW_NETWORK_WARMUP = false;
export const STORE_WEBVIEW_PRELOAD_KEEP_ALIVE_MS = 0;
export const ENABLE_STORE_TAB_LAZY = false;
export const ENABLE_STORE_WEBVIEW_CACHE = true;
export const ENABLE_STORE_WEBVIEW_LOADING_MASK = true;

export function getStoreWebViewPerfVariantLabel(): string {
  return [
    `preload=${ENABLE_STORE_WEBVIEW_PRELOAD ? 1 : 0}`,
    `tab_lazy=${ENABLE_STORE_TAB_LAZY ? 1 : 0}`,
    `loading_mask=${ENABLE_STORE_WEBVIEW_LOADING_MASK ? 1 : 0}`,
    `cache=${ENABLE_STORE_WEBVIEW_CACHE ? 1 : 0}`,
    `network_warmup=${ENABLE_STORE_WEBVIEW_NETWORK_WARMUP ? 1 : 0}`,
    `preload_keep_alive_ms=${STORE_WEBVIEW_PRELOAD_KEEP_ALIVE_MS}`,
  ].join(',');
}

export const ANDROID_APP_USER_AGENT =
  `Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 ` +
  `(KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36 ${WEBVIEW_APP_UA_SUFFIX}`;

export const LOCAL_STORE_FALLBACK_HTML = `
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>SAHA Store</title>
  <style>
    :root {
      color-scheme: light;
      --primary: #8a5a44;
      --text: #1f2937;
      --muted: #6b7280;
      --bg: #ffffff;
      --card: #f8fafc;
      --safe-top: env(safe-area-inset-top, 0px);
      --safe-bottom: env(safe-area-inset-bottom, 0px);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: calc(20px + var(--safe-top)) 20px calc(20px + var(--safe-bottom));
    }
    .card {
      width: min(420px, 100%);
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      padding: 18px;
      background: var(--card);
      text-align: center;
    }
    h1 {
      font-size: 18px;
      margin: 0 0 8px;
    }
    p {
      margin: 0 0 14px;
      color: var(--muted);
      line-height: 1.45;
      font-size: 14px;
    }
    .hint {
      display: inline-block;
      border-radius: 999px;
      background: #f7f1ee;
      color: var(--primary);
      border: 1px solid #d6c7bf;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <section class="card">
    <h1>상점 페이지를 불러오는 중입니다</h1>
    <p>네트워크 상태를 확인한 뒤 다시 시도해 주세요.</p>
    <span class="hint">SAHA STORE FALLBACK</span>
  </section>
</body>
</html>
`;

export function getStoreWebViewUri() {
  if (__DEV__) {
    if (USE_DEPLOYED_STORE_WEBVIEW_IN_DEV) {
      return STORE_WEBVIEW_URL;
    }
    return Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
  }
  return STORE_WEBVIEW_URL;
}

function parseUrlSafely(rawUrl: string): URL | null {
  try {
    return new URL(rawUrl);
  } catch {
    return null;
  }
}

export function getStoreWebViewAllowedHosts(): string[] {
  const hostSet = new Set<string>();

  const runtimeUrl = parseUrlSafely(getStoreWebViewUri());
  const releaseUrl = parseUrlSafely(STORE_WEBVIEW_URL);

  if (runtimeUrl?.host) hostSet.add(runtimeUrl.host.toLowerCase());
  if (releaseUrl?.host) hostSet.add(releaseUrl.host.toLowerCase());

  if (__DEV__) {
    hostSet.add('localhost');
    hostSet.add('127.0.0.1');
    hostSet.add('10.0.2.2');
  }

  // Example Domain 내 "Learn more" 링크(iana.org)도 WebView 내부에서 허용
  hostSet.add('iana.org');
  hostSet.add('www.iana.org');

  return Array.from(hostSet);
}

export function getStoreWebViewOriginWhitelist(): string[] {
  const allowedHosts = getStoreWebViewAllowedHosts();
  const allowlist: string[] = ['about:blank'];

  for (const host of allowedHosts) {
    // react-native-webview의 originWhitelist는 origin 단위로 매칭하므로
    // path 와일드카드(`/*`) 대신 scheme://host[:port] 형태를 사용한다.
    allowlist.push(`https://${host}`);
    allowlist.push(`http://${host}`);
  }

  return allowlist;
}

export function isAllowedStoreWebViewUrl(rawUrl: string): boolean {
  if (!rawUrl) return false;
  if (rawUrl === 'about:blank') return true;
  if (rawUrl.startsWith('data:text/html')) return true;

  const parsed = parseUrlSafely(rawUrl);
  if (!parsed) return false;

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== 'https:' && protocol !== 'http:') return false;

  const allowedHosts = getStoreWebViewAllowedHosts();
  return allowedHosts.includes(parsed.host.toLowerCase());
}

export { WEBVIEW_APP_UA_SUFFIX };
