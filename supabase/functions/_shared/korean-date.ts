/**
 * 한국 시간(Asia/Seoul) 기준 날짜/시간 유틸리티
 * Deno 환경에서 사용
 */

/**
 * 한국 시간 기준 오늘 날짜 (YYYY-MM-DD 형식)
 */
export function getKoreanDateString(): string {
  const now = new Date();
  // 한국 시간으로 변환
  // Intl.DateTimeFormat을 사용하여 한국 시간으로 포맷팅
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}

/**
 * 한국 시간 기준 현재 시간 (ISO 형식)
 */
export function getKoreanDateTimeISO(): string {
  const now = new Date();
  // 한국 시간의 타임스탬프 계산
  const koreanOffset = 9 * 60 * 60 * 1000; // UTC+9 (밀리초)
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  const koreanTime = new Date(utcTime + koreanOffset);
  return koreanTime.toISOString();
}

