/**
 * 날짜 포맷 유틸 함수
 */

/**
 * 결제/사용 내역용 날짜 포맷
 * - 오늘: "오늘 - 10월 30일"
 * - 어제: "어제 - 10월 29일"
 * - 2~6일 전: "3일 전 - 10월 27일"
 * - 7일 이상: "10월 20일"
 */
export const formatPaymentDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  const month = date.getMonth() + 1;
  const day = date.getDate();

  if (days === 0) return `오늘 - ${month}월 ${day}일`;
  if (days === 1) return `어제 - ${month}월 ${day}일`;
  if (days < 7) return `${days}일 전 - ${month}월 ${day}일`;
  
  // 7일 이상이면 날짜만 표시
  return `${month}월 ${day}일`;
};

