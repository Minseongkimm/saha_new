import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Image, Linking, Platform, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Colors } from '../../constants/colors';
import { supabase } from '../../utils/database/supabaseClient';
import {
  ANDROID_APP_USER_AGENT,
  LOCAL_STORE_FALLBACK_HTML,
  WEBVIEW_APP_UA_SUFFIX,
  getStoreWebViewOriginWhitelist,
  getStoreWebViewUri,
  isAllowedStoreWebViewUrl,
} from './storeWebViewConfig';

const BRIDGE_NAME = 'saha';
const BRIDGE_VERSION = 1;
const APP_VERSION = '1.1.2';
const BRIDGE_REQUEST_MAX_AGE_MS = 30_000;
const BRIDGE_REPLAY_CACHE_TTL_MS = 3 * 60_000;
const BRIDGE_REPLAY_CACHE_MAX_SIZE = 300;
const LOCAL_WEB_HOSTS = new Set(['localhost:3000', '127.0.0.1:3000', '10.0.2.2:3000']);
const WEBVIEW_PERF_LOG_PREFIX = '[StoreWebViewPerf]';
const LOADING_MASK_HIDE_DELAY_MS = 120;
const AUTO_BENCH_TOTAL_RUNS = 10;
const AUTO_BENCH_NEXT_RUN_DELAY_MS = 260;

type StoreWebViewPerfSession = {
  id: string;
  t0: number;
  t1?: number;
  t2?: number;
  t3?: number;
  source: string;
  latestUrl?: string;
};

type StoreWebViewPerfResult = {
  id: string;
  source: string;
  totalMs: number;
  t0ToT1Ms?: number;
  t1ToT2Ms?: number;
  t2ToT3Ms?: number;
  url?: string;
  marker: string;
  timestamp: number;
};

type StoreWebViewAutoBenchSummary = {
  count: number;
  totalMedian?: number;
  t0ToT1Median?: number;
  t1ToT2Median?: number;
  t2ToT3Median?: number;
};

let activePerfSession: StoreWebViewPerfSession | null = null;
const perfDebugSubscribers = new Set<(line: string) => void>();
const perfResultSubscribers = new Set<(result: StoreWebViewPerfResult) => void>();

function subscribeStoreWebViewPerfDebug(listener: (line: string) => void) {
  perfDebugSubscribers.add(listener);
  return () => {
    perfDebugSubscribers.delete(listener);
  };
}

function emitNativeLog(message: string) {
  for (const listener of perfDebugSubscribers) {
    listener(message);
  }

  const maybeHook = (globalThis as { nativeLoggingHook?: (msg: string, level: number) => void })
    .nativeLoggingHook;

  if (typeof maybeHook === 'function') {
    // RN 네이티브 로그 채널로 직접 보내 devicectl --console에서 캡처 가능하게 한다.
    maybeHook(message, 0);
    return;
  }

  console.log(message);
}

function subscribeStoreWebViewPerfResult(listener: (result: StoreWebViewPerfResult) => void) {
  perfResultSubscribers.add(listener);
  return () => {
    perfResultSubscribers.delete(listener);
  };
}

function emitPerfResult(result: StoreWebViewPerfResult) {
  for (const listener of perfResultSubscribers) {
    listener(result);
  }
}

function createPerfSession(source: string): StoreWebViewPerfSession {
  const now = Date.now();
  const id = `swv_${now}_${Math.random().toString(36).slice(2, 8)}`;
  return { id, t0: now, source };
}

function formatDuration(value?: number) {
  if (typeof value !== 'number') return '-';
  return `${value}ms`;
}

function formatMs(value?: number) {
  if (typeof value !== 'number') return '-';
  return `${value}ms`;
}

function median(values: number[]) {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function parseAutoBenchRunIndex(source: string) {
  const matched = source.match(/^auto_bench_run_(\d+)$/);
  if (!matched) return null;
  const index = Number(matched[1]);
  return Number.isFinite(index) ? index : null;
}

function buildAutoBenchSummary(results: StoreWebViewPerfResult[]): StoreWebViewAutoBenchSummary | null {
  if (!results.length) return null;

  const totals = results.map((item) => item.totalMs);
  const t0ToT1 = results
    .map((item) => item.t0ToT1Ms)
    .filter((value): value is number => typeof value === 'number');
  const t1ToT2 = results
    .map((item) => item.t1ToT2Ms)
    .filter((value): value is number => typeof value === 'number');
  const t2ToT3 = results
    .map((item) => item.t2ToT3Ms)
    .filter((value): value is number => typeof value === 'number');

  return {
    count: results.length,
    totalMedian: median(totals),
    t0ToT1Median: median(t0ToT1),
    t1ToT2Median: median(t1ToT2),
    t2ToT3Median: median(t2ToT3),
  };
}

function ensurePerfSession(source: string) {
  if (!activePerfSession) {
    activePerfSession = createPerfSession(source);
    emitNativeLog(
      `${WEBVIEW_PERF_LOG_PREFIX} id=${activePerfSession.id} T0(auto)=${activePerfSession.t0} source=${source}`
    );
  }
  return activePerfSession;
}

export function markStoreWebViewT0(source: string = 'tab_press') {
  if (activePerfSession && !activePerfSession.t3) {
    emitNativeLog(
      `${WEBVIEW_PERF_LOG_PREFIX} id=${activePerfSession.id} previous session closed early without T3`
    );
  }

  activePerfSession = createPerfSession(source);
  emitNativeLog(`${WEBVIEW_PERF_LOG_PREFIX} id=${activePerfSession.id} T0=${activePerfSession.t0} source=${source}`);
}

function markStoreWebViewT1(url?: string) {
  const session = ensurePerfSession('on_load_start_without_tab_press');
  if (session.t1) return;
  const now = Date.now();
  session.t1 = now;
  if (url) session.latestUrl = url;
  emitNativeLog(
    `${WEBVIEW_PERF_LOG_PREFIX} id=${session.id} T1=${now} delta(T0->T1)=${formatDuration(now - session.t0)} url=${url || '-'}`
  );
}

function markStoreWebViewT2(url?: string) {
  const session = ensurePerfSession('on_load_end_without_tab_press');
  if (session.t2) return;
  const now = Date.now();
  session.t2 = now;
  if (url) session.latestUrl = url;
  emitNativeLog(
    `${WEBVIEW_PERF_LOG_PREFIX} id=${session.id} T2=${now} delta(T0->T2)=${formatDuration(now - session.t0)} delta(T1->T2)=${formatDuration(session.t1 ? now - session.t1 : undefined)} url=${url || '-'}`
  );
}

function markStoreWebViewT3(marker: string) {
  const session = ensurePerfSession('web_ready_without_tab_press');
  if (session.t3) return;
  const now = Date.now();
  session.t3 = now;
  const totalMs = now - session.t0;
  const t0ToT1Ms = typeof session.t1 === 'number' ? session.t1 - session.t0 : undefined;
  const t1ToT2Ms =
    typeof session.t1 === 'number' && typeof session.t2 === 'number' ? session.t2 - session.t1 : undefined;
  const t2ToT3Ms = typeof session.t2 === 'number' ? now - session.t2 : undefined;

  emitNativeLog(
    `${WEBVIEW_PERF_LOG_PREFIX} id=${session.id} T3=${now} marker=${marker} delta(T0->T3)=${formatDuration(totalMs)}`
  );
  emitNativeLog(
    `${WEBVIEW_PERF_LOG_PREFIX}[RESULT] id=${session.id} total=${formatDuration(totalMs)} T0->T1=${formatDuration(t0ToT1Ms)} T1->T2=${formatDuration(t1ToT2Ms)} T2->T3=${formatDuration(t2ToT3Ms)} url=${session.latestUrl || '-'} marker=${marker}`
  );

  emitPerfResult({
    id: session.id,
    source: session.source,
    totalMs,
    t0ToT1Ms,
    t1ToT2Ms,
    t2ToT3Ms,
    url: session.latestUrl,
    marker,
    timestamp: now,
  });
}

type BridgeAction =
  | 'GET_CUSTOMER_CONTEXT'
  | 'GET_APP_INFO'
  | 'OPEN_EXTERNAL_URL'
  | 'TRACK_EVENT';

interface BridgeRequestEnvelope {
  bridge: string;
  version: number;
  type: 'request';
  action: BridgeAction | string;
  payload?: unknown;
  callbackId: string;
  nonce: string;
  timestamp: number;
}

interface BridgeResponseEnvelope {
  bridge: string;
  version: number;
  type: 'response';
  action: string;
  callbackId: string;
  ok: boolean;
  payload?: unknown;
  error?: {
    code: string;
    message: string;
  };
  timestamp: number;
}

const INJECTED_BRIDGE_SCRIPT = `
  (function() {
    if (window.NativeBridge) return;

    var callbacks = {};
    var BRIDGE_NAME = '${BRIDGE_NAME}';
    var BRIDGE_VERSION = ${BRIDGE_VERSION};

    function call(action, payload) {
      var callbackId = 'cb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      var nonce = 'n_' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
      return new Promise(function(resolve, reject) {
        callbacks[callbackId] = { resolve: resolve, reject: reject };

        if (!window.ReactNativeWebView || typeof window.ReactNativeWebView.postMessage !== 'function') {
          delete callbacks[callbackId];
          reject(new Error('ReactNativeWebView bridge is unavailable'));
          return;
        }

        window.ReactNativeWebView.postMessage(JSON.stringify({
          bridge: BRIDGE_NAME,
          version: BRIDGE_VERSION,
          type: 'request',
          action: action,
          payload: payload || null,
          callbackId: callbackId,
          nonce: nonce,
          timestamp: Date.now()
        }));

        setTimeout(function() {
          if (!callbacks[callbackId]) return;
          delete callbacks[callbackId];
          reject(new Error('Bridge request timeout'));
        }, 7000);
      });
    }

    window.__resolveNativeBridge = function(response) {
      if (!response || typeof response !== 'object') return;
      var pending = callbacks[response.callbackId];
      if (!pending) return;
      delete callbacks[response.callbackId];

      if (!response.ok) {
        var message = response.error && response.error.message ? response.error.message : 'Bridge request failed';
        var code = response.error && response.error.code ? response.error.code : 'BRIDGE_ERROR';
        pending.reject(new Error(code + ': ' + message));
        return;
      }

      pending.resolve(response.payload);
    };

    window.NativeBridge = { call: call, version: BRIDGE_VERSION };
    window.dispatchEvent(new Event('native-bridge-ready'));
  })();
  true;
`;

const StoreWebViewScreen: React.FC = () => {
  const webViewRef = useRef<WebView>(null);
  const currentPageUrlRef = useRef<string>('');
  const replayRequestCacheRef = useRef<Map<string, number>>(new Map());
  const loadingMaskHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoBenchNextRunTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoBenchRunningRef = useRef<boolean>(false);
  const [canGoBack, setCanGoBack] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLoadingMaskVisible, setIsLoadingMaskVisible] = useState<boolean>(true);
  const [useLocalFallback, setUseLocalFallback] = useState<boolean>(false);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [customerName, setCustomerName] = useState<string>('고객님');
  const [perfDebugLines, setPerfDebugLines] = useState<string[]>([]);
  const [perfResultLines, setPerfResultLines] = useState<string[]>([]);
  const [isAutoBenchRunning, setIsAutoBenchRunning] = useState<boolean>(false);
  const [autoBenchResults, setAutoBenchResults] = useState<StoreWebViewPerfResult[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadCustomerName = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!mounted || !user) return;

        let resolvedName: string | null =
          (typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim()) ||
          (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
          null;

        if (!resolvedName && user.id) {
          const { data: birthInfo } = await supabase
            .from('birth_info')
            .select('name')
            .eq('user_id', user.id)
            .maybeSingle();
          if (typeof birthInfo?.name === 'string' && birthInfo.name.trim()) {
            resolvedName = birthInfo.name.trim();
          }
        }

        if (!resolvedName && user.email) {
          resolvedName = user.email.split('@')[0];
        }

        if (mounted && resolvedName) {
          setCustomerName(resolvedName);
        }
      } catch (error) {
        console.warn('StoreWebViewScreen loadCustomerName error:', error);
      }
    };

    loadCustomerName();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!__DEV__) return;
    return subscribeStoreWebViewPerfDebug((line) => {
      setPerfDebugLines((prev) => [line, ...prev].slice(0, 6));
    });
  }, []);

  const webViewUri = useMemo(() => getStoreWebViewUri(), []);
  const originWhitelist = useMemo(() => getStoreWebViewOriginWhitelist(), []);
  const effectiveOriginWhitelist = useMemo(
    () => (__DEV__ ? ['*'] : originWhitelist),
    [originWhitelist]
  );
  const webViewSource = useMemo(
    () =>
      useLocalFallback
        ? { html: LOCAL_STORE_FALLBACK_HTML, baseUrl: webViewUri }
        : { uri: webViewUri },
    [useLocalFallback, webViewUri]
  );

  useEffect(() => {
    currentPageUrlRef.current = webViewUri;
  }, [webViewUri]);

  useEffect(() => {
    return () => {
      if (loadingMaskHideTimerRef.current) {
        clearTimeout(loadingMaskHideTimerRef.current);
        loadingMaskHideTimerRef.current = null;
      }

      if (autoBenchNextRunTimerRef.current) {
        clearTimeout(autoBenchNextRunTimerRef.current);
        autoBenchNextRunTimerRef.current = null;
      }
    };
  }, []);

  const showLoadingMask = useCallback(() => {
    if (loadingMaskHideTimerRef.current) {
      clearTimeout(loadingMaskHideTimerRef.current);
      loadingMaskHideTimerRef.current = null;
    }
    setIsLoadingMaskVisible(true);
  }, []);

  const hideLoadingMask = useCallback(() => {
    if (loadingMaskHideTimerRef.current) {
      clearTimeout(loadingMaskHideTimerRef.current);
    }
    loadingMaskHideTimerRef.current = setTimeout(() => {
      setIsLoadingMaskVisible(false);
      loadingMaskHideTimerRef.current = null;
    }, LOADING_MASK_HIDE_DELAY_MS);
  }, []);

  const triggerAutoBenchRun = useCallback((runIndex: number) => {
    markStoreWebViewT0(`auto_bench_run_${runIndex}`);
    setHasError(false);
    setUseLocalFallback(false);
    showLoadingMask();
    setReloadKey((prev) => prev + 1);
  }, [showLoadingMask]);

  const startAutoBench = useCallback(() => {
    if (isAutoBenchRunning) return;
    setAutoBenchResults([]);
    setPerfResultLines([]);
    setIsAutoBenchRunning(true);
    autoBenchRunningRef.current = true;
    triggerAutoBenchRun(1);
  }, [isAutoBenchRunning, triggerAutoBenchRun]);

  useEffect(() => {
    if (!__DEV__) return;

    return subscribeStoreWebViewPerfResult((result) => {
      const runIndex = parseAutoBenchRunIndex(result.source);
      const runLabel = runIndex ? `#${runIndex}` : result.source;
      const resultLine =
        `${runLabel} total=${formatMs(result.totalMs)} ` +
        `T0->T1=${formatMs(result.t0ToT1Ms)} ` +
        `T1->T2=${formatMs(result.t1ToT2Ms)} ` +
        `T2->T3=${formatMs(result.t2ToT3Ms)}`;

      setPerfResultLines((prev) => [resultLine, ...prev].slice(0, AUTO_BENCH_TOTAL_RUNS));

      if (!autoBenchRunningRef.current || runIndex === null) {
        return;
      }

      setAutoBenchResults((prev) => {
        if (prev.some((item) => item.id === result.id)) {
          return prev;
        }
        const next = [...prev, result];
        if (runIndex >= AUTO_BENCH_TOTAL_RUNS) {
          const summary = buildAutoBenchSummary(next);
          if (summary) {
            emitNativeLog(
              `${WEBVIEW_PERF_LOG_PREFIX}[AUTO_BENCH_SUMMARY] runs=${summary.count} totalMedian=${formatMs(summary.totalMedian)} T0->T1 median=${formatMs(summary.t0ToT1Median)} T1->T2 median=${formatMs(summary.t1ToT2Median)} T2->T3 median=${formatMs(summary.t2ToT3Median)}`
            );
          }
        }
        return next;
      });

      if (runIndex >= AUTO_BENCH_TOTAL_RUNS) {
        autoBenchRunningRef.current = false;
        setIsAutoBenchRunning(false);
        return;
      }

      if (autoBenchNextRunTimerRef.current) {
        clearTimeout(autoBenchNextRunTimerRef.current);
      }
      autoBenchNextRunTimerRef.current = setTimeout(() => {
        if (!autoBenchRunningRef.current) return;
        triggerAutoBenchRun(runIndex + 1);
      }, AUTO_BENCH_NEXT_RUN_DELAY_MS);
    });
  }, [triggerAutoBenchRun]);

  const autoBenchSummary = useMemo(() => {
    return buildAutoBenchSummary(autoBenchResults);
  }, [autoBenchResults]);

  const autoBenchReportText = useMemo(() => {
    if (!autoBenchSummary) return '';

    const header = [
      '[StoreWebView Auto Benchmark]',
      `runs=${autoBenchSummary.count}/${AUTO_BENCH_TOTAL_RUNS}`,
      `total median=${formatMs(autoBenchSummary.totalMedian)}`,
      `T0->T1 median=${formatMs(autoBenchSummary.t0ToT1Median)}`,
      `T1->T2 median=${formatMs(autoBenchSummary.t1ToT2Median)}`,
      `T2->T3 median=${formatMs(autoBenchSummary.t2ToT3Median)}`,
      '',
      '[Per Run]',
    ];

    const perRun = [...autoBenchResults]
      .sort((a, b) => {
        const aIndex = parseAutoBenchRunIndex(a.source);
        const bIndex = parseAutoBenchRunIndex(b.source);
        if (typeof aIndex === 'number' && typeof bIndex === 'number') {
          return aIndex - bIndex;
        }
        if (typeof aIndex === 'number') return -1;
        if (typeof bIndex === 'number') return 1;
        return a.timestamp - b.timestamp;
      })
      .map((item) => {
        const runIndex = parseAutoBenchRunIndex(item.source);
        const runLabel = runIndex ? `#${runIndex}` : item.source;
        return `${runLabel} total=${formatMs(item.totalMs)} T0->T1=${formatMs(item.t0ToT1Ms)} T1->T2=${formatMs(item.t1ToT2Ms)} T2->T3=${formatMs(item.t2ToT3Ms)}`;
      });

    return [...header, ...perRun].join('\n');
  }, [autoBenchResults, autoBenchSummary]);

  const handleShareAutoBenchReport = useCallback(async () => {
    if (!autoBenchReportText) return;

    try {
      await Share.share({
        title: 'Store WebView Auto Benchmark',
        message: autoBenchReportText,
      });
    } catch (error) {
      console.warn('[StoreWebViewPerf] failed to share auto benchmark report:', error);
    }
  }, [autoBenchReportText]);

  const sendBridgeResponse = useCallback(
    (
      request: BridgeRequestEnvelope,
      options: {
        ok: boolean;
        payload?: unknown;
        errorCode?: string;
        errorMessage?: string;
      }
    ) => {
      const responseEnvelope: BridgeResponseEnvelope = {
        bridge: BRIDGE_NAME,
        version: BRIDGE_VERSION,
        type: 'response',
        action: request.action,
        callbackId: request.callbackId,
        ok: options.ok,
        payload: options.payload,
        error: options.ok
          ? undefined
          : {
            code: options.errorCode || 'BRIDGE_ERROR',
            message: options.errorMessage || 'Bridge request failed.',
          },
        timestamp: Date.now(),
      };

      const script = `
        window.__resolveNativeBridge &&
        window.__resolveNativeBridge(${JSON.stringify(responseEnvelope)});
        true;
      `;
      webViewRef.current?.injectJavaScript(script);
    },
    []
  );

  const handleWebMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      const sourceUrl = event.nativeEvent.url || currentPageUrlRef.current;
      if (!isAllowedStoreWebViewUrl(sourceUrl)) {
        console.warn('[StoreWebViewBridge] blocked message from untrusted url:', sourceUrl);
        return;
      }

      const rawData = event.nativeEvent.data;
      if (!rawData) return;

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawData);
      } catch {
        return;
      }

      const request = parsed as BridgeRequestEnvelope;

      if (
        request?.bridge !== BRIDGE_NAME ||
        request?.type !== 'request' ||
        typeof request?.callbackId !== 'string' ||
        typeof request?.nonce !== 'string' ||
        typeof request?.action !== 'string'
      ) {
        return;
      }

      const now = Date.now();
      if (!Number.isFinite(request.timestamp)) {
        sendBridgeResponse(request, {
          ok: false,
          errorCode: 'INVALID_TIMESTAMP',
          errorMessage: 'Bridge request timestamp is invalid.',
        });
        return;
      }

      if (Math.abs(now - request.timestamp) > BRIDGE_REQUEST_MAX_AGE_MS) {
        sendBridgeResponse(request, {
          ok: false,
          errorCode: 'STALE_REQUEST',
          errorMessage: 'Bridge request is too old or has an invalid device time.',
        });
        return;
      }

      // callbackId + nonce를 단기 캐시에 보관해 브릿지 재전송(replay) 요청을 차단한다.
      const replayKey = `${request.callbackId}:${request.nonce}`;
      const replayCache = replayRequestCacheRef.current;
      for (const [key, timestamp] of replayCache.entries()) {
        if (now - timestamp > BRIDGE_REPLAY_CACHE_TTL_MS) {
          replayCache.delete(key);
        }
      }
      if (replayCache.has(replayKey)) {
        sendBridgeResponse(request, {
          ok: false,
          errorCode: 'DUPLICATE_REQUEST',
          errorMessage: 'Duplicate bridge request blocked.',
        });
        return;
      }
      replayCache.set(replayKey, now);
      while (replayCache.size > BRIDGE_REPLAY_CACHE_MAX_SIZE) {
        const oldestKey = replayCache.keys().next().value;
        if (!oldestKey) break;
        replayCache.delete(oldestKey);
      }

      if (request.version !== BRIDGE_VERSION) {
        sendBridgeResponse(request, {
          ok: false,
          errorCode: 'UNSUPPORTED_VERSION',
          errorMessage: `Unsupported bridge version: ${request.version}`,
        });
        return;
      }

      if (request.action === 'GET_CUSTOMER_CONTEXT') {
        sendBridgeResponse(request, {
          ok: true,
          payload: {
            customerName,
          },
        });
        return;
      }

      if (request.action === 'GET_APP_INFO') {
        sendBridgeResponse(request, {
          ok: true,
          payload: {
            platform: Platform.OS,
            appVersion: APP_VERSION,
            bridgeVersion: BRIDGE_VERSION,
            userAgentSuffix: WEBVIEW_APP_UA_SUFFIX,
          },
        });
        return;
      }

      if (request.action === 'OPEN_EXTERNAL_URL') {
        const payload = request.payload as { url?: unknown } | undefined;
        const targetUrl = typeof payload?.url === 'string' ? payload.url.trim() : '';

        if (!targetUrl || (!targetUrl.startsWith('https://') && !targetUrl.startsWith('http://'))) {
          sendBridgeResponse(request, {
            ok: false,
            errorCode: 'INVALID_PAYLOAD',
            errorMessage: 'OPEN_EXTERNAL_URL requires a valid http/https url.',
          });
          return;
        }

        try {
          await Linking.openURL(targetUrl);
          sendBridgeResponse(request, {
            ok: true,
            payload: { opened: true, url: targetUrl },
          });
        } catch (error) {
          sendBridgeResponse(request, {
            ok: false,
            errorCode: 'OPEN_URL_FAILED',
            errorMessage: error instanceof Error ? error.message : 'Failed to open external url.',
          });
        }
        return;
      }

      if (request.action === 'TRACK_EVENT') {
        const payload = request.payload as { name?: unknown; params?: unknown } | undefined;
        const name = typeof payload?.name === 'string' ? payload.name : '';
        if (!name) {
          sendBridgeResponse(request, {
            ok: false,
            errorCode: 'INVALID_PAYLOAD',
            errorMessage: 'TRACK_EVENT requires event name.',
          });
          return;
        }

        console.log('[StoreWebViewBridge] TRACK_EVENT', name, payload?.params ?? null);
        if (name === 'store_core_content_ready' || name === 'store_view_opened') {
          markStoreWebViewT3(name);
        }
        sendBridgeResponse(request, {
          ok: true,
          payload: { tracked: true, name },
        });
        return;
      }

      sendBridgeResponse(request, {
        ok: false,
        errorCode: 'UNKNOWN_ACTION',
        errorMessage: `Unknown action: ${request.action}`,
      });
    },
    [customerName, sendBridgeResponse]
  );

  const handleShouldStartLoadWithRequest = useCallback((request: { url: string; isTopFrame?: boolean }) => {
    const nextUrl = request.url;

    // iOS에서 서브 프레임/서브 리소스 요청까지 콜백이 들어올 수 있으므로
    // top-frame 네비게이션만 도메인 검증 대상으로 본다.
    if (request.isTopFrame === false) {
      return true;
    }

    // 개발 서버(HMR)에서 사용하는 ws/wss는 외부 브라우저로 넘기지 않고 무시한다.
    if (nextUrl.startsWith('ws://') || nextUrl.startsWith('wss://')) {
      return false;
    }

    try {
      const nextHost = new URL(nextUrl).host.toLowerCase();
      if (LOCAL_WEB_HOSTS.has(nextHost)) {
        currentPageUrlRef.current = nextUrl;
        return true;
      }
    } catch {
      // no-op
    }

    if (isAllowedStoreWebViewUrl(nextUrl)) {
      currentPageUrlRef.current = nextUrl;
      return true;
    }

    // 비허용 도메인은 외부 브라우저로 넘기지 않고 차단한다.
    // (외부 열기가 필요하면 Web -> NativeBridge OPEN_EXTERNAL_URL 액션을 사용)
    console.warn('[StoreWebView] blocked untrusted url:', nextUrl);
    return false;
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') {
        return;
      }

      const onBackPress = () => {
        if (canGoBack) {
          webViewRef.current?.goBack();
          return true;
        }
        BackHandler.exitApp();
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [canGoBack])
  );

  const handleReload = useCallback(() => {
    setHasError(false);
    showLoadingMask();
    setUseLocalFallback(false);
    setReloadKey(prev => prev + 1);
  }, [showLoadingMask]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WebView
        key={reloadKey}
        ref={webViewRef}
        source={webViewSource}
        originWhitelist={effectiveOriginWhitelist}
        javaScriptEnabled
        domStorageEnabled
        allowsBackForwardNavigationGestures
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        cacheEnabled
        setSupportMultipleWindows={false}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        keyboardDisplayRequiresUserAction={false}
        applicationNameForUserAgent={WEBVIEW_APP_UA_SUFFIX}
        userAgent={Platform.OS === 'android' ? ANDROID_APP_USER_AGENT : undefined}
        injectedJavaScriptBeforeContentLoaded={INJECTED_BRIDGE_SCRIPT}
        onMessage={handleWebMessage}
        onLoadStart={() => {
          setHasError(false);
          showLoadingMask();
          markStoreWebViewT1(currentPageUrlRef.current || webViewUri);
        }}
        onLoadEnd={(event) => {
          markStoreWebViewT2(event.nativeEvent.url || currentPageUrlRef.current);
          hideLoadingMask();
        }}
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
          if (navState.url) {
            currentPageUrlRef.current = navState.url;
          }
        }}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onError={() => {
          setIsLoadingMaskVisible(false);
          if (!useLocalFallback) {
            setUseLocalFallback(true);
            return;
          }
          setHasError(true);
        }}
        style={styles.webview}
      />

      {hasError && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorTitle}>상점을 불러올 수 없습니다.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleReload}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoadingMaskVisible && !hasError && (
        <View style={styles.loadingMask}>
          <Image
            source={require('../../../assets/logo/logo_icon.png')}
            style={styles.loadingMaskLogo}
          />
          <ActivityIndicator size="small" color={Colors.primaryColor} />
          <Text style={styles.loadingMaskText}>상점을 준비하고 있어요</Text>
        </View>
      )}

      {__DEV__ && (
        <View style={styles.perfDebugPanel}>
          <Text style={styles.perfDebugTitle}>WebView Perf Debug</Text>
          <View style={styles.perfActionRow}>
            <TouchableOpacity
              onPress={startAutoBench}
              disabled={isAutoBenchRunning}
              style={[styles.perfActionButton, isAutoBenchRunning ? styles.perfActionButtonDisabled : null]}
            >
              <Text style={styles.perfActionButtonText}>
                {isAutoBenchRunning
                  ? `자동측정 진행 중 ${autoBenchResults.length}/${AUTO_BENCH_TOTAL_RUNS}`
                  : `자동측정 ${AUTO_BENCH_TOTAL_RUNS}회 시작`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleShareAutoBenchReport}
              disabled={isAutoBenchRunning || !autoBenchSummary}
              style={[
                styles.perfActionButton,
                styles.perfActionButtonSecondary,
                isAutoBenchRunning || !autoBenchSummary ? styles.perfActionButtonDisabled : null,
              ]}
            >
              <Text style={styles.perfActionButtonText}>결과 공유</Text>
            </TouchableOpacity>
          </View>

          {autoBenchSummary && (
            <View style={styles.perfSummaryBlock}>
              <Text style={styles.perfSummaryTitle}>
                Summary ({autoBenchSummary.count}/{AUTO_BENCH_TOTAL_RUNS})
              </Text>
              <Text style={styles.perfSummaryLine}>
                total median: {formatMs(autoBenchSummary.totalMedian)}
              </Text>
              <Text style={styles.perfSummaryLine}>
                T0-&gt;T1 median: {formatMs(autoBenchSummary.t0ToT1Median)}
              </Text>
              <Text style={styles.perfSummaryLine}>
                T1-&gt;T2 median: {formatMs(autoBenchSummary.t1ToT2Median)}
              </Text>
              <Text style={styles.perfSummaryLine}>
                T2-&gt;T3 median: {formatMs(autoBenchSummary.t2ToT3Median)}
              </Text>
            </View>
          )}

          {perfResultLines.length > 0 && (
            <View style={styles.perfResultBlock}>
              <Text style={styles.perfResultTitle}>Recent RESULT</Text>
              {perfResultLines.map((line, index) => (
                <Text key={`result-line-${index}-${line}`} style={styles.perfResultLine}>
                  {line}
                </Text>
              ))}
            </View>
          )}

          {perfDebugLines.map((line, index) => (
            <Text key={`${index}-${line}`} style={styles.perfDebugLine}>
              {line}
            </Text>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  webview: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.primaryColor,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingMask: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingMaskLogo: {
    width: 44,
    height: 44,
    marginBottom: 12,
    resizeMode: 'contain',
  },
  loadingMaskText: {
    marginTop: 10,
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '500',
  },
  perfDebugPanel: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  perfActionRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  perfActionButton: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 7,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  perfActionButtonSecondary: {
    marginLeft: 8,
    backgroundColor: '#059669',
  },
  perfActionButtonDisabled: {
    opacity: 0.7,
  },
  perfActionButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  perfSummaryBlock: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 6,
    marginBottom: 8,
  },
  perfSummaryTitle: {
    color: '#FDE68A',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  perfSummaryLine: {
    color: '#F3F4F6',
    fontSize: 10,
    lineHeight: 13,
  },
  perfResultBlock: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 6,
    marginBottom: 8,
  },
  perfResultTitle: {
    color: '#A7F3D0',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 3,
  },
  perfResultLine: {
    color: '#E5E7EB',
    fontSize: 9,
    lineHeight: 12,
  },
  perfDebugTitle: {
    color: '#A7F3D0',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  perfDebugLine: {
    color: '#F3F4F6',
    fontSize: 10,
    lineHeight: 13,
    marginBottom: 2,
  },
});

export default StoreWebViewScreen;
