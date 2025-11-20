/**
 * 네비게이션 스택을 안전하게 뒤로 이동합니다.
 * 뒤로 갈 수 없는 경우 MainTabs로 이동합니다.
 * 
 * @param navigation - React Navigation 객체
 */
export function safeGoBack(navigation: any): void {
  try {
    if (typeof navigation.canGoBack === 'function' && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('MainTabs');
    }
  } catch (error) {
    console.warn('네비게이션 뒤로가기 오류:', error);
    try {
      navigation.navigate('MainTabs');
    } catch (fallbackError) {
      console.error('MainTabs로 이동 실패:', fallbackError);
    }
  }
}

