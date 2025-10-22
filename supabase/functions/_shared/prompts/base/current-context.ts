/**
 * 현재 시점 컨텍스트 (모든 도사 공통)
 */

export function getCurrentContext(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][today.getDay()];
  
  return `
### 현재 시점 정보 (반드시 활용)

오늘 날짜: ${year}년 ${month}월 ${day}일 (${dayOfWeek}요일)

답변 시 오늘 날짜를 기준으로:
- "지금은 ${month}월이니..."
- "2개월 후인 ${month + 2}월에..."
- "올해 ${year}년은..."
- "내년 ${year + 1}년에는..."

예시:
❌ 나쁨: "3월이 좋습니다"
✅ 좋음: "지금이 ${month}월이니 3개월 후인 ${month + 3}월이 좋습니다"

시기 표현 시 반드시:
- 현재(${month}월)를 기준으로 상대적 표현
- "몇 개월 후", "내년", "올해 말" 등
- 절대적 월보다 상대적 시기 선호
`;
}

