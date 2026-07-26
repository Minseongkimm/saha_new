# Google Play 자동 배포 가이드

GitHub Actions로 Android release AAB를 빌드해서 Google Play에 업로드하는 흐름 정리.
비밀번호/키 값은 이 문서에 절대 적지 않음 — 전부 GitHub Secrets에 등록돼 있음.

## 전체 흐름

```
GitHub Actions 수동 실행 (workflow_dispatch)
  ↓
1. 코드 체크아웃 + Node/Java 설치
  ↓
2. git에 없는 파일(.gitignore 대상)을 GitHub Secrets에서 그 순간에만 복원
   - src/config/env.ts
   - android/app/saha-release.keystore
  ↓
3. versionCode 자동 계산 (build.gradle의 base 값 + 이 워크플로우 실행 횟수)
   → Play는 versionCode가 항상 이전보다 커야 업로드를 받아줌
  ↓
4. ./gradlew bundleRelease → 서명된 .aab 생성
  ↓
5. Google Play Developer API(서비스 계정 인증)로 지정한 트랙에 업로드
  ↓
끝. 러너가 꺼지면 복원했던 비밀 파일들도 같이 사라짐. 저장소엔 워크플로우 설정 파일만 영구히 남음.
```

## 워크플로우 파일

- 위치: [`.github/workflows/android-release.yml`](../.github/workflows/android-release.yml)
- `main`과 작업 브랜치 양쪽에 있어야 함 — GitHub이 workflow_dispatch를 인식하려면 **default 브랜치(main)에도 최소 한 번은 있어야** `gh workflow run` / Actions 탭에서 실행 가능. 이후 실제 실행은 `--ref`로 다른 브랜치 지정 가능.
- 트리거: `workflow_dispatch`, 입력값 `track` (internal / alpha / beta / production)

## 실행 방법

```bash
gh workflow run android-release.yml -R Minseongkimm/saha_new --ref <브랜치명> -f track=internal
```

또는 GitHub 저장소 → **Actions 탭 → Android Release to Play Store → Run workflow**에서 브랜치와 트랙 선택 후 실행.

## 필요한 GitHub Secrets (저장소 Settings → Secrets and variables → Actions)

| Secret 이름 | 내용 |
|---|---|
| `ANDROID_ENV_TS_BASE64` | `src/config/env.ts` 파일 전체를 base64 인코딩한 값 |
| `ANDROID_KEYSTORE_BASE64` | `android/app/saha-release.keystore` 파일을 base64 인코딩한 값 |
| `ANDROID_KEY_ALIAS` | keystore 안의 키 별칭 (`saha-key`) |
| `ANDROID_KEYSTORE_PASSWORD` | keystore 여는 비밀번호 |
| `ANDROID_KEY_PASSWORD` | 키 비밀번호 (PKCS12라 store 비밀번호와 동일) |
| `PLAY_SERVICE_ACCOUNT_JSON` | Google Cloud 서비스 계정 키 JSON 전체 내용 |

값 갱신 예시 (로컬 파일 → 시크릿, 대화창엔 값이 안 찍히게 파이프로만 전달):

```bash
base64 -i src/config/env.ts | gh secret set ANDROID_ENV_TS_BASE64 -R Minseongkimm/saha_new
base64 -i android/app/saha-release.keystore | gh secret set ANDROID_KEYSTORE_BASE64 -R Minseongkimm/saha_new
cat /path/to/service-account.json | gh secret set PLAY_SERVICE_ACCOUNT_JSON -R Minseongkimm/saha_new
```

## Google Play 쪽 사전 준비 (한 번만 하면 됨)

1. **최초 앱 등록/심사**: Play Console 웹에서 최소 1회 수동 업로드·심사 통과가 되어 있어야 API 업로드가 열림 (완료됨).
2. **Google Cloud 프로젝트**에서 "Google Play Android Developer API" 사용 설정.
3. **서비스 계정** 생성 (IAM 및 관리자 → 서비스 계정 → 만들기) → JSON 키 발급.
   - IAP 검증용으로 쓰던 기존 `saha-iap-verifier` 계정과는 별개로, 배포 전용 서비스 계정(`play-store-deploy`)을 새로 만듦 — 권한 최소화 원칙.
4. **Play Console → 사용자 및 권한 → 새 사용자 초대**에서 이 서비스 계정 이메일 초대, 앱(com.saha.ai)에 대해:
   - 앱을 테스트 트랙으로 출시
   - 프로덕션으로 출시, 기기 제외, Play 앱 서명 사용
   - 앱 정보 보기
   (그 외 권한은 부여하지 않음 — 최소 권한)

참고: 예전엔 Play Console 설정에 "API 액세스"라는 별도 메뉴가 있었는데, 현재는 사라졌고 위 방식(서비스 계정 생성 → 사용자 및 권한에서 이메일로 초대)만으로 충분함.

## Android 로컬 서명 설정

- `android/app/build.gradle`의 `signingConfigs.release`는 Gradle 프로젝트 프로퍼티(`MYAPP_RELEASE_STORE_FILE` 등)를 읽음.
- 이 값들은 **`android/gradle.properties`(git 추적됨)에 절대 넣지 않음** — 과거에 평문 비밀번호가 커밋된 적 있어서 keystore 비밀번호를 교체한 이력 있음.
- 로컬 빌드 시엔 `~/.gradle/gradle.properties`(레포 밖, git 무관)에 4개 값을 넣어두면 자동으로 합쳐져서 적용됨.
- CI(GitHub Actions)에선 `./gradlew bundleRelease -PMYAPP_RELEASE_STORE_FILE=... -PMYAPP_RELEASE_KEY_ALIAS=...` 처럼 `-P` 플래그로 Secrets 값을 직접 전달함.

## versionCode 처리

- 실제 빌드에 쓰는 versionCode = `build.gradle`에 적힌 base 값 + 이 워크플로우의 GitHub Actions 실행 횟수(`github.run_number`).
- **`-Pandroid.injected.version.code`로 오버라이드하려 했으나 이 프로젝트에선 적용 안 됨** (defaultConfig에 리터럴로 박힌 값이 그대로 우선 적용됨) → `sed`로 `android/app/build.gradle` 파일의 `versionCode` 줄을 CI에서 직접 치환하는 방식으로 변경함. CI 러너 안에서만 수정되고 커밋되지 않으니 저장소의 실제 파일은 그대로 유지됨.
- `versionName`(예: `1.1.2`)은 자동화 대상 아님, 의미 있는 버전 올릴 때 수동으로 build.gradle에서 직접 변경.

## 트러블슈팅 메모 (실제로 겪은 것들)

1. **`npm ci` ERESOLVE 에러** (`@types/react` peer dependency 충돌): CI 러너는 로컬과 달리 엄격하게 검사함 → `npm ci --legacy-peer-deps`로 해결.
2. **"Version code N has already been used"**: `-Pandroid.injected.version.code` 오버라이드가 안 먹혀서 build.gradle의 원래 값이 그대로 올라간 것 → 위 versionCode 처리 방식(sed 치환)으로 해결.
3. `upload-google-play` 액션의 `track` 파라미터는 deprecated → `tracks`로 변경함.
4. 첫 성공 실행: 캐시 없는 CI에서 native 모듈(nitro-modules, iap, screens, gesture-handler 등) 4개 아키텍처 빌드 포함 총 14~20분 정도 소요됨. 이후 실행은 Gradle 캐시가 없다면 비슷하게 걸릴 수 있음(러너가 매번 새로 뜨는 ubuntu-latest라 기본적으로 캐시 안 남음).
5. `internal` 트랙으로 먼저 검증 완료 (2026-07-26). `production`으로 돌릴 땐 `-f track=production`으로 실행.
