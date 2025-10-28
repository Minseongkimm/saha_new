/**
 * 텍스트에서 쉼표를 제거하고 자연스럽게 변환하는 유틸리티 함수
 */

/**
 * 쉼표를 제거하고 자연스러운 문장으로 변환
 * @param text 원본 텍스트
 * @returns 쉼표가 제거된 텍스트
 */
export function removeCommas(text: string): string {
  if (!text) return text;
  const normalizedNewlines: string = text.replace(/\r\n/g, '\n');
  return normalizedNewlines
    // 쉼표 제거
    .replace(/,/g, '')
    // 개행은 보존하고, 연속된 공백/탭만 하나로 정리
    .replace(/[ \t\f\v]+/g, ' ')
    // 개행 주변의 여백 정리
    .replace(/[ ]+\n/g, '\n')
    .replace(/\n[ ]+/g, '\n')
    // 시작/끝 공백 제거 (개행은 유지)
    .replace(/^\s+/g, '')
    .replace(/\s+$/g, '');
}

/**
 * 채팅 메시지에서 쉼표를 제거
 * @param message 채팅 메시지
 * @returns 쉼표가 제거된 메시지
 */
export function removeCommasFromMessage(message: string): string {
  if (!message) return message;

  return removeCommas(message);
}

/**
 * 여러 텍스트 배열에서 쉼표를 제거
 * @param texts 텍스트 배열
 * @returns 쉼표가 제거된 텍스트 배열
 */
export function removeCommasFromTexts(texts: string[]): string[] {
  if (!texts || !Array.isArray(texts)) return texts;

  return texts.map(text => removeCommas(text));
}
