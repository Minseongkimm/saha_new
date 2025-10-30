/**
 * 점수 관련 유틸리티 함수들
 */

/**
 * 점수에 따른 색상 반환
 */
export const getScoreColor = (score: number): { color: string } => {
  if (score >= 80) return { color: '#4caf50' };
  if (score >= 60) return { color: '#8bc34a' };
  if (score >= 40) return { color: '#ff9800' };
  if (score >= 20) return { color: '#ff5722' };
  return { color: '#f44336' };
};

/**
 * 점수 바 배경색 반환
 */
export const getScoreBarColor = (score: number): string => {
  if (score >= 80) return '#e8f5e8';
  if (score >= 60) return '#f1f8e9';
  if (score >= 40) return '#fff3e0';
  if (score >= 20) return '#ffebee';
  return '#ffcdd2';
};

/**
 * 유효한 점수 반환 (0-100 범위, NaN 체크)
 */
export const getValidScore = (score: number): number => {
  if (score < 0 || score > 100 || isNaN(score)) {
    return Math.floor(Math.random() * 31) + 70;
  }
  return score;
};

/**
 * 점수에 따른 상태 메시지 반환
 */
export const getScoreStatus = (score: number): { main: string; sub: string } => {
  const validScore = getValidScore(score);
  
  if (validScore >= 100) return { main: '최고의 하루가 되겠네요', sub: '마음껏 즐기세요' };
  if (validScore >= 90) return { main: '매우 좋은 하루가 될 것 같아요', sub: '기대해도 좋습니다' };
  if (validScore >= 80) return { main: '좋은 하루가 되겠네요', sub: '편안하게 지내세요' };
  if (validScore >= 70) return { main: '나쁘지 않은 하루가 될 것 같아요', sub: '안심하고 지내세요' };
  if (validScore >= 60) return { main: '보통의 하루가 되겠네요', sub: '편히 지내세요' };
  if (validScore >= 50) return { main: '조금 조심할 하루가 될 것 같아요', sub: '무리하지 마세요' };
  if (validScore >= 40) return { main: '신중한 하루가 되겠네요', sub: '천천히 지내세요' };
  if (validScore >= 30) return { main: '조심스러운 하루가 될 것 같아요', sub: '조금만 신경 쓰세요' };
  return { main: '주의깊게 지내야 할 하루가 되겠네요', sub: '조심히 지나가세요' };
};

/**
 * 카테고리 점수 텍스트 반환
 */
export const getCategoryScoreText = (score: number): string => {
  if (score >= 80) return "최고";
  if (score >= 60) return "좋음";
  if (score >= 40) return "보통";
  if (score >= 20) return "주의";
  return "위험";
};

/**
 * 카테고리 점수 색상 반환
 */
export const getCategoryScoreColor = (score: number): { color: string } => {
  if (score >= 80) return { color: '#2e7d32' };
  if (score >= 60) return { color: '#4caf50' };
  if (score >= 40) return { color: '#ff9800' };
  if (score >= 20) return { color: '#f44336' };
  return { color: '#d32f2f' };
};

