/**
 * 문장 부호 규칙 (모든 도사 공통)
 */

export function getPunctuationRules(): string {
  return `
### 문장 부호 규칙

- **쉼표(,) 사용 금지** - 공백으로 구분
- 나열 시 "그리고", "또한" 사용
- 중요한 사주 용어는 **굵게** 표시
`;
}

