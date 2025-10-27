/**
 * ** 문법을 제거하는 함수
 * @param text - 마크다운이 포함된 텍스트
 * @returns 마크다운이 제거된 텍스트
 */
export const removeBoldMarkup = (text: string): string => {
  if (!text) return '';
  return text.replace(/\*\*(.*?)\*\*/g, '$1');
};
