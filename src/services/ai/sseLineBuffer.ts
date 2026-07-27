/**
 * SSE 스트림에서 완결된 "data: ..." 줄만 추출하는 파서를 생성한다.
 * xhr.onprogress는 줄(개행) 경계와 무관하게 임의의 지점에서 텍스트를 나눠 전달하므로,
 * 아직 개행으로 끝나지 않은 마지막 줄은 버퍼에 남겨 다음 조각과 이어붙여야 한다.
 * (그렇지 않으면 한 줄이 두 조각에 걸쳐 도착할 때 그 줄 전체가 조용히 버려진다.)
 */
export function createSSEDataLineExtractor() {
  let buffer = '';
  return (fragment: string): string[] => {
    buffer += fragment;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    return lines
      .map(line => line.trim())
      .filter(line => line.startsWith('data: '))
      .map(line => line.slice(6).trim());
  };
}
