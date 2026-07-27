import { createSSEDataLineExtractor } from '../sseLineBuffer';

describe('createSSEDataLineExtractor', () => {
  it('완결된 한 줄을 하나의 조각으로 받으면 그대로 추출한다', () => {
    const extract = createSSEDataLineExtractor();
    const result = extract('data: {"a":1}\n');
    expect(result).toEqual(['{"a":1}']);
  });

  it('한 줄이 정확히 "data: " 접두사 중간에서 두 조각으로 쪼개져도 글자를 잃지 않는다', () => {
    // 실제 버그 재현: "긍정적인 에너지가 넘치며" 문장이 청크 경계에서 잘리는 상황
    const extract = createSSEDataLineExtractor();
    const first = extract('data: {"content":"긍정적인 에');
    const second = extract('너지가 넘치며"}\n');

    expect(first).toEqual([]); // 아직 미완성 줄이므로 아무것도 추출되지 않아야 함
    expect(second).toEqual(['{"content":"긍정적인 에너지가 넘치며"}']); // 이어붙여서 완전한 줄로 추출됨
  });

  it('한 조각에 여러 완결된 줄이 들어있으면 모두 추출한다', () => {
    const extract = createSSEDataLineExtractor();
    const result = extract('data: {"a":1}\ndata: {"b":2}\n');
    expect(result).toEqual(['{"a":1}', '{"b":2}']);
  });

  it('마지막 줄이 미완성이면 버퍼에 남기고 다음 호출에서 이어붙인다', () => {
    const extract = createSSEDataLineExtractor();
    const first = extract('data: {"a":1}\ndata: {"b":2');
    const second = extract('}\ndata: {"c":3}\n');

    expect(first).toEqual(['{"a":1}']);
    expect(second).toEqual(['{"b":2}', '{"c":3}']);
  });

  it('data: 로 시작하지 않는 줄(예: SSE 빈 줄)은 무시한다', () => {
    const extract = createSSEDataLineExtractor();
    const result = extract('data: {"a":1}\n\ndata: {"b":2}\n');
    expect(result).toEqual(['{"a":1}', '{"b":2}']);
  });

  it('[DONE] 신호도 하나의 완결된 줄로 정상 추출한다', () => {
    const extract = createSSEDataLineExtractor();
    const result = extract('data: [DONE]\n');
    expect(result).toEqual(['[DONE]']);
  });

  it('여러 조각에 걸쳐 스트리밍되는 전체 시나리오를 순서대로 처리해도 내용이 보존된다', () => {
    const extract = createSSEDataLineExtractor();
    const chunks = [
      'data: {"content":"안',
      '녕하세',
      '요 반갑',
      '습니다"}\ndata: {"content":" 오늘',
      '도 좋은 하루"}\ndata: [DONE]\n',
    ];

    const extracted = chunks.flatMap(chunk => extract(chunk));
    expect(extracted).toEqual([
      '{"content":"안녕하세요 반갑습니다"}',
      '{"content":" 오늘도 좋은 하루"}',
      '[DONE]',
    ]);
  });
});
