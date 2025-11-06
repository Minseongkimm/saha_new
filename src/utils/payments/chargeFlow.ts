// 공통 결제 플로우 함수
// - handleChargeFlow: 충전 금액을 받아서 전체 결제 프로세스 처리
import { Alert } from 'react-native';
import { getProductIdFromAmount, startPurchase, finalizePurchase } from './iapClient';
import { refreshBalance } from './balance';
import { getTotalSahaFromProductId } from '../../constants/payments';

interface ChargeFlowOptions {
  onSuccess?: (newBalance: number) => void;
  onError?: (error: Error) => void;
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
  try {
    // 1. 상품 ID 변환
    const productId = getProductIdFromAmount(amount);
    if (!productId) {
      throw new Error(`지원하지 않는 충전 금액입니다: ${amount}원`);
    }

    // 2. 결제 시작 (스토어 결제 화면 표시)
    const { provider, receiptOrToken } = await startPurchase(productId);

    // 3. 서버 검증 및 잔액 지급
    const verifyResult = await finalizePurchase({
      provider,
      receiptOrToken,
      productId,
    });

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

    // 6. 성공 처리
    if (options?.onSuccess && newBalance !== null && newBalance !== undefined) {
      options.onSuccess(newBalance);
    }

    // 7. 충전된 총 사바 개수 계산
    const totalSaha = getTotalSahaFromProductId(productId);

    // 성공 메시지 표시
    Alert.alert('충전 완료', `${totalSaha} 사바가 충전되었습니다.`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';

    // 사용자 취소는 조용히 처리
    if (errorMessage.includes('취소')) {
      return;
    }

    // 에러 콜백 호출
    if (options?.onError) {
      options.onError(error instanceof Error ? error : new Error(errorMessage));
    }

    // 에러 메시지 표시
    Alert.alert('충전 실패', errorMessage);
  }
}

