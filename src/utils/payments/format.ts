// 결제 금액 포맷 유틸
// - formatKRW: 원화(KRW) 표기
export function formatKRW(amountMinor: number): string {
  // amountMinor is already in KRW won (no decimals)
  try {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amountMinor);
  } catch {
    return `₩${amountMinor.toLocaleString('ko-KR')}`;
  }
}


