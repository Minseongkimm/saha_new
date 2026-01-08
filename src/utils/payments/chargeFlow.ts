// 공통 결제 플로우 함수
// - handleChargeFlow: 충전 금액을 받아서 전체 결제 프로세스 처리
import { Alert } from 'react-native';
import { getProductIdFromAmount, startPurchase, finalizePurchase } from './iapClient';
import { refreshBalance } from './balance';
import { getTotalSahaFromProductId } from '../../constants/payments';

interface ChargeFlowOptions {
  onSuccess?: (newBalance: number) => void;
  onError?: (error: Error) => void;
  onLoading?: (isLoading: boolean, message?: string) => void;
}

/**
 * 충전 플로우 실행
 * @param amount 충전 금액 (예: 1000, 3000, 5000, 10000)
 * @param options 성공/에러 콜백
 */
export async function handleChargeFlow(
  amount: number,
  options?: ChargeFlowOptions
): Promise<void> {
  // 결제 과정이 시작되었는지 추적하는 플래그
  let isPurchaseStarted = false;
  
  try {
    // 1. 상품 ID 변환
    const productId = getProductIdFromAmount(amount);
    if (!productId) {
      throw new Error(`지원하지 않는 충전 금액입니다: ${amount}원`);
    }

    // 2. 결제 시작 (스토어 결제 화면 표시)
    // Apple 결제 UI는 시스템이 표시 (로딩 표시하지 않음)
    const { provider, receiptOrToken, purchase } = await startPurchase(productId);
    
    // 결제가 시작되었음을 표시 (startPurchase 성공 = 실제 결제 과정 진입)
    isPurchaseStarted = true;

    // 3. 결제 완료 후 서버 검증 시작 - 이제 로딩 모달 표시
    options?.onLoading?.(true, '결제 확인 중...');
    
    try {
      const verifyResult = await finalizePurchase({
        provider,
        receiptOrToken,
        productId,
      }, purchase);

      // 4. 검증 결과 확인
      if (verifyResult.status !== 'approved') {
        throw new Error(
          verifyResult.message || '결제 검증에 실패했습니다. 고객센터로 문의해주세요.'
        );
      }

      // 5. 잔액 확인 (서버에서 반환된 잔액 사용, 없으면 재조회)
      let newBalance: number | null = verifyResult.currentBalance ?? null;
      
      if (newBalance === null || newBalance === undefined) {
        // 서버에서 잔액을 반환하지 않은 경우에만 재조회
        // 짧은 지연 후 재조회 (DB 업데이트 반영 대기)
        await new Promise(resolve => setTimeout(resolve, 300));
        newBalance = await refreshBalance();
      }

      // 6. 로딩 종료
      options?.onLoading?.(false);

      // 7. 성공 처리
      if (options?.onSuccess && newBalance !== null && newBalance !== undefined) {
        options.onSuccess(newBalance);
      }

      // 8. 충전된 총 사바 개수 계산
      const totalSaha = getTotalSahaFromProductId(productId);

      // 성공 메시지 표시
      Alert.alert('충전 완료', `${totalSaha} 사바가 충전되었습니다.`);
    } finally {
      // 에러가 발생해도 로딩 종료
      options?.onLoading?.(false);
    }
  } catch (error) {
    // 로딩 종료
    options?.onLoading?.(false);
    
    // 에러 로깅
    console.error('충전 플로우 에러:', error instanceof Error ? error.message : String(error));

    let errorMessage = '알 수 없는 오류가 발생했습니다.';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // react-native-iap 에러 코드 처리
      const errorCode = (error as any)?.code;
      if (errorCode === 'E_ITEM_UNAVAILABLE') {
        errorMessage = '상품을 찾을 수 없습니다.\nApp Store Connect에서 상품이 등록되어 있는지 확인해주세요.';
      } else if (errorCode === 'E_NETWORK_ERROR' || errorMessage.includes('네트워크') || errorMessage.includes('Network')) {
        errorMessage = '네트워크 연결을 확인해주세요.';
      } else if (errorCode === 'E_SERVICE_ERROR' || errorMessage.includes('서비스') || errorMessage.includes('Service')) {
        errorMessage = '결제 서비스에 일시적인 문제가 있습니다.\n잠시 후 다시 시도해주세요.';
      } else if (errorMessage.includes('초기화') || errorMessage.includes('init')) {
        errorMessage = '결제 시스템 초기화에 실패했습니다.\n앱을 재시작해주세요.';
      } else if (errorMessage.includes('timeout') || errorMessage.includes('시간이 초과')) {
        errorMessage = '결제 시간이 초과되었습니다.\n다시 시도해주세요.';
      } else if (errorMessage.includes('Request timeout')) {
        errorMessage = '서버 응답 시간이 초과되었습니다.\n네트워크를 확인하고 다시 시도해주세요.';
      } else if (errorMessage.includes('로그인이 필요')) {
        errorMessage = '로그인이 필요합니다.\n앱을 재시작해주세요.';
      } else if (errorMessage.includes('서버 오류')) {
        errorMessage = '서버에 일시적인 문제가 있습니다.\n잠시 후 다시 시도해주세요.';
      }
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String((error as any).message);
    }

    // 사용자 취소는 조용히 처리
    if (errorMessage.includes('취소')) {
      return;
    }

    // 에러 콜백 호출
    if (options?.onError) {
      options.onError(error instanceof Error ? error : new Error(errorMessage));
    }

    // 결제 과정이 시작된 후에만 Alert 표시
    // (결제 화면을 열기 전의 에러는 Alert 표시하지 않음)
    if (isPurchaseStarted) {
      Alert.alert('충전 실패', errorMessage);
    }
  }
}

