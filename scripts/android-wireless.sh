#!/usr/bin/env bash
# Android 무선 디버깅: 기기 연결 후 run-android 실행
#
# 사용법:
#   1) 휴대폰: 설정 → 개발자 옵션 → 무선 디버깅 켬
#   2) 무선 디버깅 화면에서 "기기와 페어링" → IP:페어링포트, 6자리 코드 확인
#   3) 터미널: adb pair <IP>:<페어링포트>  입력 후 코드 입력
#   4) 무선 디버깅 화면에 표시된 "IP 주소 및 포트" 확인 (예: 192.168.0.10:5555)
#   5) ADB_WIRELESS=192.168.0.10:5555 npm run android:wireless
#      또는 ./scripts/android-wireless.sh 192.168.0.10:5555

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

ADB="${ADB:-adb}"
CONNECT_TARGET="${ADB_WIRELESS:-$1}"

if [ -z "$CONNECT_TARGET" ]; then
  echo "사용법: ADB_WIRELESS=<IP>:<포트> npm run android:wireless"
  echo "    또는: npm run android:wireless -- <IP>:<포트>"
  echo ""
  echo "예: ADB_WIRELESS=192.168.0.10:5555 npm run android:wireless"
  echo ""
  echo "휴대폰에서 무선 디버깅 → '기기와 페어링'으로 먼저 페어링한 뒤,"
  echo "무선 디버깅 화면에 나오는 'IP 주소 및 포트'를 넣으세요."
  exit 1
fi

echo "무선 연결 중: $CONNECT_TARGET"
"$ADB" connect "$CONNECT_TARGET"

echo ""
echo "연결된 기기:"
"$ADB" devices

echo ""
echo "앱 빌드 및 설치 중..."
exec npx react-native run-android
