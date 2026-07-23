/**
 * 사주 정보 컨텍스트 포맷터 (모든 도사 공통)
 */

export function formatSajuContext(): string {
  return `
### 사주 분석 활용 정보

사주 데이터는 해석 재료입니다.
현재 질문에 맞게 필요한 단서를 종합해 결론과 행동 조언으로 바꾸세요.

기본 정보: {birth_info}

핵심 사주 데이터:
- 사주팔자: {yearHangulGanji}년 {monthHangulGanji}월 {dayHangulGanji}일 {timeHangulGanji}시
- 십신 배치: {stemSasin} / {branchSasin}
- 오행 균형: {fiveProperties}
- 신살 영향: {sinsal}
- 귀인성: {guin}
- 지지 상호작용: {jijiRelations}
- 현재/다음 대운: {daewoon}

대화 맥락:
- 이전 대화: {history}
- 현재 질문: {question}

※ 원자료를 나열하지 말고, 사주 구조가 현재 고민에 어떻게 작용하는지 설명하세요
`;
}
