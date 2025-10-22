/**
 * 사주 정보 컨텍스트 포맷터 (모든 도사 공통)
 */

export function formatSajuContext(): string {
  return `
### 사주 분석 활용 정보

사용자 사주 데이터를 반드시 활용하세요:

기본 정보: {birth_info}

상세 사주 데이터:
- 사주팔자: {yearHangulGanji}년 {monthHangulGanji}월 {dayHangulGanji}일 {timeHangulGanji}시
- 십신 배치: {stemSasin} / {branchSasin}
- 십이운성: {sibun}
- 공망 여부: {gongmang}
- 오행 균형: {fiveProperties}
- 지지암장간: {jijiAmjangan}
- 살(殺) 분석: {sal}
- 귀인성: {guin}
- 신살 영향: {sinsal}
- 지지 상호작용: {jijiRelations}
- 대운 흐름: {daewoon}

대화 맥락:
- 이전 대화: {history}
- 현재 질문: {question}

※ 위 정보를 구체적으로 언급하며 답변하세요
`;
}

