#!/usr/bin/env bash
# Android 무선 디버깅: 기기 연결 후 run-android 실행
#
# 최초 설치 (네이티브 코드 바뀌었을 때만):
#   1) 휴대폰: 설정 → 개발자 옵션 → 무선 디버깅 켬
#   2) 무선 디버깅 화면에서 "기기와 페어링" → IP:페어링포트, 6자리 코드 확인
#   3) 터미널: adb pair <IP>:<페어링포트>  입력 후 코드 입력 (페어링은 최초 1회만)
#   4) 무선 디버깅 화면에 표시된 "IP 주소 및 포트" 확인 (예: 192.168.0.10:5555)
#   5) ADB_WIRELESS=192.168.0.10:5555 npm run android:wireless
#      또는 ./scripts/android-wireless.sh 192.168.0.10:5555
#
# 와이파이가 바뀌어서 IP만 다시 잡아주면 될 때 (재빌드/재설치 없이 빠르게):
#   ADB_WIRELESS=192.168.0.10:5555 npm run android:wireless:reconnect
#   또는 ./scripts/android-wireless.sh --reconnect 192.168.0.10:5555
#   -> adb connect + adb reverse만 하고 Metro만 새로 띄움 (이미 설치된 앱 그대로 사용)

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

ADB="${ADB:-adb}"

RECONNECT_ONLY=0
if [ "$1" = "--reconnect" ] || [ "$1" = "-r" ]; then
  RECONNECT_ONLY=1
  shift
fi

CONNECT_TARGET="${ADB_WIRELESS:-$1}"

if [ -z "$CONNECT_TARGET" ]; then
  echo "사용법: ADB_WIRELESS=<IP>:<포트> npm run android:wireless"
  echo "    또는: npm run android:wireless -- <IP>:<포트>"
  echo "    와이파이만 바뀐 경우: npm run android:wireless:reconnect -- <IP>:<포트>"
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

if [ "$RECONNECT_ONLY" = "1" ]; then
  echo ""
  echo "재빌드 없이 재연결만 진행합니다 (앱은 이미 설치되어 있다고 가정)..."
  # mDNS로 같은 기기가 중복으로 잡혀서 -s 없이 reverse 하면 "more than one device" 에러가 남
  "$ADB" -s "$CONNECT_TARGET" reverse tcp:8081 tcp:8081
  echo "Metro 서버를 시작합니다. 폰에서 앱을 다시 열거나 개발자 메뉴에서 Reload 해주세요."
  exec npx react-native start
fi

echo ""
echo "앱 빌드 및 설치 중..."
exec npx react-native run-android
