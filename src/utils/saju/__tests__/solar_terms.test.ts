import { getDaysToAdjacentSolarTerm, getMonthBranchIndexBySolarTerms } from '../solar_terms';

describe('getDaysToAdjacentSolarTerm', () => {
  // 2024년 입춘의 실제 시각은 2024-02-04 17:27 KST로 널리 알려져 있음
  // (참고: 한국강사신문 등 다수 매체가 인용하는 값. lunar-javascript는 이를
  // 북경시(UTC+8) 기준 2024-02-04 16:27로 계산하며, 본 함수는 +1시간 보정한다).
  const IPCHUN_2024_KST = new Date(2024, 1, 4, 17, 27, 0);

  it('입춘 정확히 3일 전 출생자는 다음 절기(입춘)까지 3일이다', () => {
    const birth = new Date(IPCHUN_2024_KST.getTime() - 3 * 24 * 60 * 60 * 1000);
    expect(getDaysToAdjacentSolarTerm(birth, 1)).toBeCloseTo(3, 3);
  });

  it('입춘 정확히 6일 전 출생자는 다음 절기(입춘)까지 6일이다', () => {
    const birth = new Date(IPCHUN_2024_KST.getTime() - 6 * 24 * 60 * 60 * 1000);
    expect(getDaysToAdjacentSolarTerm(birth, 1)).toBeCloseTo(6, 3);
  });

  it('입춘 정확히 3일 후 출생자는 이전 절기(입춘)까지 3일이다', () => {
    const birth = new Date(IPCHUN_2024_KST.getTime() + 3 * 24 * 60 * 60 * 1000);
    expect(getDaysToAdjacentSolarTerm(birth, -1)).toBeCloseTo(3, 3);
  });

  it('입춘 당일 정오(절기 시각 17:27 이전) 출생자는 다음 절기(입춘)까지 약 5.3시간(0.23일)만 남는다', () => {
    // 절기 시각(17:27)보다 이전이므로 아직 입춘에 도달하지 않은 상태 - 순행 기준 "다음 절기"는 입춘 그 자체
    const noonSameDay = new Date(2024, 1, 4, 12, 0, 0);
    expect(getDaysToAdjacentSolarTerm(noonSameDay, 1)).toBeCloseTo(0.227, 2);
  });

  it('북경시 절기 시각을 그대로 썼다면 나왔을 오차(1시간)만큼 어긋나지 않는다', () => {
    // 보정이 빠지면 입춘 3일 전 출생자의 다음 절기까지 일수가 3일이 아니라
    // 3 - 1/24 ≈ 2.958일로 나와야 한다. 정확히 3일이 나오는지로 보정 여부를 확인.
    const birth = new Date(IPCHUN_2024_KST.getTime() - 3 * 24 * 60 * 60 * 1000);
    const days = getDaysToAdjacentSolarTerm(birth, 1);
    expect(Math.abs(days - 3)).toBeLessThan(0.01);
  });
});

describe('getMonthBranchIndexBySolarTerms', () => {
  it('입춘(2024-02-04) 다음날은 인월(寅, index 0)에 속한다', () => {
    // 2024년 입춘은 2/4 17:27 KST이므로 2/5는 확실히 입춘 이후 → 인월
    expect(getMonthBranchIndexBySolarTerms(2024, 2, 5)).toBe(0);
  });

  it('입춘(2024-02-04) 전날(2/3)은 아직 축월(丑, index 11)에 속한다', () => {
    expect(getMonthBranchIndexBySolarTerms(2024, 2, 3)).toBe(11);
  });

  it('경칩(2024-03-05) 이후인 3/6은 묘월(卯, index 1)에 속한다', () => {
    expect(getMonthBranchIndexBySolarTerms(2024, 3, 6)).toBe(1);
  });

  it('기존 근사 테이블이 틀렸던 경계일(입추 대략값 8/8 vs 실제 2024년 입추 8/7)에서 정밀 계산이 실제 절기를 따른다', () => {
    // 근사 테이블: 8월은 8일부터 신월(申)로 봤음. 하지만 2024년 실제 입추는 8/7 08:09 KST(북경시 07:09 보정)이므로
    // 8/7 당일부터 이미 신월(申, index 6)이어야 한다 - 근사 테이블이라면 8/8 이전이라 미월(未, index 5)로 오판했을 케이스.
    expect(getMonthBranchIndexBySolarTerms(2024, 8, 7)).toBe(6);
  });
});
