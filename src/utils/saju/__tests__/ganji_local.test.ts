import { calculateSaju } from '../ganji_local';

describe('calculateSaju', () => {
  it('입춘 이전(2/3) 출생자는 전년도 연주를 쓴다 (연주 경계는 1/1이 아니라 입춘 기준)', () => {
    // 2024년 입춘은 2/4 17:27 KST이므로 2024-02-03은 아직 계묘년(작년)에 속해야 한다
    const result = calculateSaju({
      year: 2024, month: 2, day: 3, hour: 12, minute: 0,
      isLunar: false, isLeapMonth: false, gender: 0,
    });
    expect(result.yearHangulGanji).toBe('계묘');
  });

  it('입춘 이후(2/5) 출생자는 해당 연도 연주를 쓴다', () => {
    const result = calculateSaju({
      year: 2024, month: 2, day: 5, hour: 12, minute: 0,
      isLunar: false, isLeapMonth: false, gender: 0,
    });
    expect(result.yearHangulGanji).toBe('갑진');
  });

  it('절기 경계일 근처(입추 2024-08-07)에서 월주가 근사 테이블이 아닌 실제 절기를 따른다', () => {
    // 기존 근사 테이블은 8/8부터 신월로 판정했지만, 2024년 실제 입추는 8/7 09:09 KST이므로
    // 8/7 당일 이미 신월(申)이어야 한다. 갑진년(甲) → 신월 = 壬申.
    const result = calculateSaju({
      year: 2024, month: 8, day: 7, hour: 15, minute: 0,
      isLunar: false, isLeapMonth: false, gender: 0,
    });
    expect(result.monthHangulGanji).toBe('임신');
  });

  it('gender에 따라 daewoon(대운) 순행/역행 방향이 달라진다 (회귀 테스트: 예전엔 gender가 항상 남자(0)로 고정됐음)', () => {
    const input = {
      year: 2024, month: 2, day: 5, hour: 12, minute: 0,
      isLunar: false, isLeapMonth: false,
    };
    const male = calculateSaju({ ...input, gender: 0 });
    const female = calculateSaju({ ...input, gender: 1 });
    // 갑진년(甲, 양간) - 남자는 순행, 여자는 역행 → 첫 대운 간지가 서로 반대 방향으로 달라야 함
    expect(male.daewoon[0].ganji).not.toBe(female.daewoon[0].ganji);
  });

  it('daewoon 시작 나이가 하드코딩된 9세로 고정되지 않는다 (회귀 테스트)', () => {
    // 경칩(2024-03-05) 하루 전 출생, 갑진년(양간)+남자=순행이므로 다음 절(경칩)까지 하루(4개월, 8개월 미만)뿐 - 대운수는 0
    const result = calculateSaju({
      year: 2024, month: 3, day: 4, hour: 15, minute: 0,
      isLunar: false, isLeapMonth: false, gender: 0,
    });
    expect(result.daewoon[0].age).not.toBe(9);
    expect(result.daewoon[0].age).toBe(0);
  });

  it('daewoon은 birthDate를 반환하여 이후 재계산(궁합 등)에 사용할 수 있다', () => {
    const result = calculateSaju({
      year: 2024, month: 2, day: 5, hour: 12, minute: 30,
      isLunar: false, isLeapMonth: false, gender: 0,
    });
    expect(result.birthDate).toBeInstanceOf(Date);
    expect(result.birthDate?.getFullYear()).toBe(2024);
    expect(result.birthDate?.getMonth()).toBe(1);
    expect(result.birthDate?.getDate()).toBe(5);
  });
});
