# WebView 성능 베이스라인 통합 리포트 (웹 + 앱)
- 대상: SAHA 상점 WebView (`https://saha-store-web.vercel.app/`)
- 목적: **최적화 적용 전(베이스라인)** 성능 수치 고정

## 1) 측정 범위
- 웹(Next.js): Lighthouse 모바일 기준
- 앱(iOS):
1. App Launch(`xctrace App Launch`)
2. 상점 탭 진입(`T0 -> T1 -> T2 -> T3`)

## 2) 환경

- Web URL: `https://saha-store-web.vercel.app/`
- Device: iPhone 12 (iOS 18.7.1)
- App bundle id: `com.saha.ai`
- 앱 버전: `1.1.2`

## 3) 웹 베이스라인 (Lighthouse, Mobile, 3회)

| Metric | Run1 | Run2 | Run3 | Avg | Median |
|---|---:|---:|---:|---:|---:|
| Performance Score | 97 | 98 | 98 | 97.67 | 98 |
| FCP (ms) | 801.86 | 860.69 | 816.34 | 826.30 | 816.34 |
| LCP (ms) | 2505.83 | 2473.58 | 2464.99 | 2481.47 | 2473.58 |
| CLS | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 |
| TTI (ms) | 2513.37 | 2488.95 | 2480.28 | 2494.20 | 2488.95 |
| TBT (ms) | 29 | 40 | 11 | 26.67 | 29 |
| TTFB (ms) | 8.75 | 9.00 | 9.00 | 8.92 | 9.00 |
| INP | N/A | N/A | N/A | N/A | N/A |

### 3-1) 지표 개념 정리

- `FCP (First Contentful Paint)`: 첫 텍스트/이미지 등 콘텐츠가 화면에 처음 보이는 시점
- `LCP (Largest Contentful Paint)`: 메인 콘텐츠(가장 큰 요소)가 보이는 시점. 체감 로딩 속도의 핵심 지표
- `CLS (Cumulative Layout Shift)`: 로딩 중 화면이 얼마나 흔들리는지(레이아웃 밀림). 낮을수록 안정적
- `INP (Interaction to Next Paint)`: 사용자 입력(탭/클릭)에 대한 화면 반응 지연 시간
- `TBT (Total Blocking Time)`: 메인 스레드가 긴 작업으로 막혀 사용자 입력을 처리 못한 총 시간
- `TTFB (Time To First Byte)`: 요청 후 서버가 첫 바이트를 보내기까지 걸린 시간
- `TTI (Time to Interactive)`: 페이지가 상호작용 가능한 상태가 되는 시점(보조 지표)

### 3-2) 해석 팁

- `FCP`는 “처음 보이기 시작한 속도”, `LCP`는 “주요 내용이 실제로 다 보인 속도”를 의미
- `CLS`는 0에 가까울수록 좋고, 금융 서비스에서는 특히 중요(입력/버튼 오동작 예방)
- `INP/TBT`는 “버벅임”과 관련된 반응성 지표라 UX 체감에 직접 영향
- `TTFB`가 높으면 서버/네트워크 구간, `LCP/TTI`가 높으면 렌더링/리소스 구간 점검이 우선

요약:
- 초기 점수는 높음(97~98)
- 개선 여지는 주로 `LCP/TTI` 구간(약 2.47~2.50초)

## 4) 앱 베이스라인

### 4-1) 앱 런치 (xctrace App Launch)

원본 데이터: `/tmp/saha-app-launch.trace` (xctrace export 기준)

| 항목 | 수치 |
|---|---:|
| Process Creation | 735.83 ms |
| Static Runtime Initialization | 12.73 ms |
| UIKit Initialization | 28.50 ms |
| didFinishLaunchingWithOptions | 14.34 ms |
| Initial Frame Rendering Stage | 0.90 ms |
| 첫 렌더 타임라인 지점 | 약 825 ms |

### 4-2) 상점 탭 진입 (WebView 체감 구간)

정의:
- `T0`: 상점 탭 클릭
- `T1`: WebView `onLoadStart`
- `T2`: WebView `onLoadEnd`
- `T3`: 웹 핵심 콘텐츠 준비 완료 이벤트(`store_view_opened`)

실측(1회, 디버그 패널 캡처):

| Run | T0->T1 | T1->T2 | T2->T3 | T0->T3(total) | marker |
|---|---:|---:|---:|---:|---|
| 1 | 161 ms | 78 ms | 52 ms | 291 ms | store_view_opened |

해석:
- 흰 화면 체감은 `T0->T1`만이 아니라 보통 `T0->T2`(+일부 `T2->T3`)까지 포함
- 현재 1회 기준 가장 큰 비중은 `T0->T1`(161ms, 약 55%)

## 5) 흰 화면(White Screen)과 현재 수치 연결

흰 화면 체감 시간은 보통 아래 합으로 인지됨:

- 탭 전환/웹뷰 attach: `T0->T1`
- 문서/리소스 로딩: `T1->T2`
- 핵심 콘텐츠 확정: `T2->T3`

현재 1회 기준:
- `T0->T1` 161ms
- `T1->T2` 78ms
- `T2->T3` 52ms
- 합계 `291ms`

## 6) 남은 액션 (베이스라인 완성)

면접용 신뢰도 확보를 위해 `T0->T3`를 총 5회로 확장 권장:

| Run | T0->T1 | T1->T2 | T2->T3 | T0->T3 |
|---|---:|---:|---:|---:|
| 1 | 161 | 78 | 52 | 291 |
| 2 |  |  |  |  |
| 3 |  |  |  |  |
| 4 |  |  |  |  |
| 5 |  |  |  |  |
| Median |  |  |  |  |

## 7) 면접에서 한 줄 요약

- "웹은 Lighthouse 기준 성능 점수 97~98, CLS 0으로 기본 안정성은 확보했고, 앱에서는 상점 진입 구간을 `T0~T3`로 분해해 흰 화면 체감의 병목이 `T0->T1`에 가장 크게 걸리는 것을 수치로 확인했습니다."
