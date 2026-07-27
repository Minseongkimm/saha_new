import { calculateSaju } from '../ganji_local';

/**
 * 외부 만세력 앱(스크린샷)과 대조 검증한 실제 케이스들.
 * 사주 4주(년/월/일/시)와 대운수/방향까지 모두 대조하여 확인했다.
 * 성별은 화면에 직접 표기되지 않아, 대운 순행/역행 방향으로 역산하여 남/여를 특정했다.
 */
describe('calculateSaju - 외부 만세력 앱과의 교차검증', () => {
  it('음력 1961-04-28 19:30, 남자 → 신축/갑오/을해/병술, 대운수 2·역행', () => {
    const r = calculateSaju({
      year: 1961, month: 4, day: 28, hour: 19, minute: 30,
      isLunar: true, isLeapMonth: false, gender: 0,
    });
    expect(r.yearHangulGanji).toBe('신축');
    expect(r.monthHangulGanji).toBe('갑오');
    expect(r.dayHangulGanji).toBe('을해');
    expect(r.timeHangulGanji).toBe('병술');
    expect(r.daewoon[0].age).toBe(2);
  });

  it('양력 1961-04-28 19:30(동일 날짜를 양력으로 입력), 남자 → 신축/임진/신묘/무술, 대운수 8·역행', () => {
    // 이 케이스는 24절기 전체가 아닌 "절(節)" 12개만 기준으로 계산해야 한다는 걸 잡아낸 회귀 케이스.
    // (24절기 기준으로 계산하면 대운수 3이 나오는데, 실제로는 8이어야 한다.)
    const r = calculateSaju({
      year: 1961, month: 4, day: 28, hour: 19, minute: 30,
      isLunar: false, isLeapMonth: false, gender: 0,
    });
    expect(r.yearHangulGanji).toBe('신축');
    expect(r.monthHangulGanji).toBe('임진');
    expect(r.dayHangulGanji).toBe('신묘');
    expect(r.timeHangulGanji).toBe('무술');
    expect(r.daewoon[0].age).toBe(8);
  });

  it('양력 1964-06-24 07:30, 남자 → 갑진/경오/갑진/무진, 대운수 4·순행', () => {
    const r = calculateSaju({
      year: 1964, month: 6, day: 24, hour: 7, minute: 30,
      isLunar: false, isLeapMonth: false, gender: 0,
    });
    expect(r.yearHangulGanji).toBe('갑진');
    expect(r.monthHangulGanji).toBe('경오');
    expect(r.dayHangulGanji).toBe('갑진');
    expect(r.timeHangulGanji).toBe('무진');
    expect(r.daewoon[0].age).toBe(4);
  });

  it('양력 1991-10-15 14:13, 남자 → 신미/무술/무오/기미, 대운수 2·역행', () => {
    const r = calculateSaju({
      year: 1991, month: 10, day: 15, hour: 14, minute: 13,
      isLunar: false, isLeapMonth: false, gender: 0,
    });
    expect(r.yearHangulGanji).toBe('신미');
    expect(r.monthHangulGanji).toBe('무술');
    expect(r.dayHangulGanji).toBe('무오');
    expect(r.timeHangulGanji).toBe('기미');
    expect(r.daewoon[0].age).toBe(2);
  });

  it('양력 1992-02-06 07:30, 남자 → 임신/임인/임자/갑진, 대운수 9·순행', () => {
    const r = calculateSaju({
      year: 1992, month: 2, day: 6, hour: 7, minute: 30,
      isLunar: false, isLeapMonth: false, gender: 0,
    });
    expect(r.yearHangulGanji).toBe('임신');
    expect(r.monthHangulGanji).toBe('임인');
    expect(r.dayHangulGanji).toBe('임자');
    expect(r.timeHangulGanji).toBe('갑진');
    expect(r.daewoon[0].age).toBe(9);
  });
});

/**
 * 김홍기(음력 1961-04-28 19:30, 남자) 케이스의 상세 화면(지장간·오행·귀인·신살 등)을
 * 스크린샷과 항목별로 대조 검증한 회귀 테스트.
 * 사주: 시병술/일을해/월갑오/년신축
 */
describe('calculateSaju - 지지 십신 / 귀인 / 12신살 교차검증 (김홍기 음력 케이스)', () => {
  const r = calculateSaju({
    year: 1961, month: 4, day: 28, hour: 19, minute: 30,
    isLunar: true, isLeapMonth: false, gender: 0,
  });

  it('지지 십신(branchSasin)은 지장간의 본기(정기) 기준으로 계산한다', () => {
    // 회귀 테스트: 지장간 3개 중 우선순위 필터로 아무거나 고르던 예전 버그(년지=丑→편관)를
    // 본기(己) 기준(편재)으로 수정 - 스크린샷: 정재/정인/식신/편재 [시,일,월,년]
    expect(r.branchSasin).toEqual(['정재', '정인', '식신', '편재']);
  });

  it('천덕귀인·월덕귀인은 월지(月支) 기준으로 계산한다', () => {
    // 회귀 테스트: 예전엔 일간/월간 기준(완전히 다른 방식)으로 계산해 항상 빈 배열이었음.
    // 월지=午 → 천덕귀인=亥(일지에 존재), 월덕귀인=丙(시간에 존재)
    expect(r.guin['천덕귀인']).toEqual(['亥(해)']);
    expect(r.guin['월덕귀인']).toEqual(['丙(병)']);
  });

  it('새로 추가한 개별 귀인/살이 스크린샷과 일치한다', () => {
    expect(r.guin['복성귀인']).toEqual(['丑(축)']);
    expect(r.guin['천주귀인']).toEqual(['午(오)']);
    expect(r.guin['문창귀인']).toEqual(['午(오)']);
    expect(r.guin['학당귀인']).toEqual(['午(오)']);
    expect(r.guin['태극귀인']).toEqual(['亥(해)']);
    expect(r.guin['홍염살']).toEqual(['午(오)']);
    expect(r.guin['암록']).toEqual(['戌(술)']);
    expect(r.guin['비인살']).toEqual(['戌(술)']);
  });

  it('12신살(년지/일지/월지 3가지 기준)이 스크린샷 3개 행과 모두 일치한다', () => {
    expect(r.twelveSinsal?.byYear).toEqual({ time: '반안살', day: '역마살', month: '년살', year: '화개살' });
    expect(r.twelveSinsal?.byDay).toEqual({ time: '천살', day: '지살', month: '육해살', year: '월살' });
    expect(r.twelveSinsal?.byMonth).toEqual({ time: '화개살', day: '겁살', month: '장성살', year: '천살' });
  });

  it('백호살은 일간이 아니라 60갑자 특정 조합(시주=丙戌)에 정확히 걸린다', () => {
    // 회귀 테스트: 예전엔 일간 기준 오행 상생상극으로 오판해 일주에 잘못 표시됐음
    expect(r.sinsal.timeSinsal).toContain('백호살');
    expect(r.sinsal.daySinsal).not.toContain('백호살');
  });
});

/**
 * 두 번째 독립 소스(사주매니아, https://sajumania.com)와 대조 검증한 케이스들.
 * 이 사이트는 대운수 반올림 규칙을 삼명통회 원전 기준(나머지 8개월↑=올림, 미만=버림)으로
 * 명시하고 있어, 우리 구현이 단순 반올림에서 이 규칙으로 바뀌는 계기가 된 케이스들이다.
 */
describe('calculateSaju - 사주매니아 교차검증 (8개월 기준 비대칭 반올림 규칙)', () => {
  it('1990-03-15 10:30, 남자 → 경오/기묘/기묘/기사, 대운수 7·순행', () => {
    const r = calculateSaju({
      year: 1990, month: 3, day: 15, hour: 10, minute: 30,
      isLunar: false, isLeapMonth: false, gender: 0,
    });
    expect(r.yearHangulGanji).toBe('경오');
    expect(r.monthHangulGanji).toBe('기묘');
    expect(r.dayHangulGanji).toBe('기묘');
    expect(r.timeHangulGanji).toBe('기사');
    expect(r.daewoon[0]).toMatchObject({ age: 7, ganji: '庚辰' });
  });

  it('1985-11-02 03:15, 여자 → 을축/병술/을사/정축, 대운수 2·순행', () => {
    const r = calculateSaju({
      year: 1985, month: 11, day: 2, hour: 3, minute: 15,
      isLunar: false, isLeapMonth: false, gender: 1,
    });
    expect(r.yearHangulGanji).toBe('을축');
    expect(r.monthHangulGanji).toBe('병술');
    expect(r.dayHangulGanji).toBe('을사');
    expect(r.timeHangulGanji).toBe('정축');
    expect(r.daewoon[0]).toMatchObject({ age: 2, ganji: '丁亥' });
  });

  it('1980-01-08 12:00, 남자 → 기미/정축/경진/임오, 대운수 0 (허세수 0세도 유효함을 확인)', () => {
    // 일주=庚辰이므로 괴강살(甲辰·乙未·丙戌·丁丑·戊辰·壬戌·癸丑 중 하나는 아니지만 庚辰/庚戌/壬辰/戊戌 목록에 해당)도 함께 확인
    const r = calculateSaju({
      year: 1980, month: 1, day: 8, hour: 12, minute: 0,
      isLunar: false, isLeapMonth: false, gender: 0,
    });
    expect(r.yearHangulGanji).toBe('기미');
    expect(r.monthHangulGanji).toBe('정축');
    expect(r.dayHangulGanji).toBe('경진');
    expect(r.timeHangulGanji).toBe('임오');
    expect(r.daewoon[0]).toMatchObject({ age: 0, ganji: '丙子' });
    expect(r.gwaegangSal).toBe(true);
  });
});

/**
 * 지지 관계(삼합/반합/육합/육충/방합/삼형) 회귀 테스트.
 * 예전엔 "辰이 정확히 3개 있는 경우"만 체크하는 하드코딩이었고, 申子辰/亥卯未/寅午戌/巳酉丑
 * 같은 일반 그룹 테이블은 정의만 되고 실제로는 쓰이지 않았음 - 이제 일반 판정으로 교체.
 * 아래 케이스들은 실제 달력 날짜를 계산해 각 관계가 실제로 성립하는 것만 골랐다.
 */
describe('calculateSaju - 지지 관계(삼합/육합/육충/방합/삼형) 일반화 회귀 테스트', () => {
  it('1980-01-08 12:00 남자: 지지(午,辰,丑,未)에서 午未 육합, 丑未 육충이 성립한다', () => {
    const r = calculateSaju({
      year: 1980, month: 1, day: 8, hour: 12, minute: 0,
      isLunar: false, isLeapMonth: false, gender: 0,
    });
    expect(r.jijiRelations['육합']).toContain('午, 未');
    expect(r.jijiRelations['육충']).toContain('丑, 未');
    expect(r.jijiRelations['삼합']).toEqual([]);
    expect(r.jijiRelations['방합']).toEqual([]);
  });

  it('2020-01-01 12:00: 지지(午,卯,子,亥)에서 亥卯 목국 반합, 子卯 무례지형, 子午 육충이 성립한다', () => {
    const r = calculateSaju({
      year: 2020, month: 1, day: 1, hour: 12, minute: 0,
      isLunar: false, isLeapMonth: false, gender: 0,
    });
    expect(r.jijiRelations['반합']).toContain('亥卯(목국 반합)');
    expect(r.jijiRelations['삼형']).toContain('子卯(무례지형)');
    expect(r.jijiRelations['육충']).toContain('子, 午');
    expect(r.jijiRelations['삼합']).toEqual([]);
  });

  it('2015-02-10 12:00: 지지(午,巳,寅,未)에서 巳午未 남방화국 방합, 寅午 화국 반합이 성립한다', () => {
    const r = calculateSaju({
      year: 2015, month: 2, day: 10, hour: 12, minute: 0,
      isLunar: false, isLeapMonth: false, gender: 0,
    });
    expect(r.jijiRelations['방합']).toContain('巳午未(남방화국)');
    expect(r.jijiRelations['반합']).toContain('寅午(화국 반합)');
  });

  it('2015-02-15 12:00: 지지(午,戌,寅,未)에서 寅午戌 화국 삼합이 완전히 성립한다 (회귀 테스트: 예전엔 辰이 3개일 때만 삼합으로 오판했음)', () => {
    const r = calculateSaju({
      year: 2015, month: 2, day: 15, hour: 12, minute: 0,
      isLunar: false, isLeapMonth: false, gender: 0,
    });
    expect(r.jijiRelations['삼합']).toContain('寅午戌(화국)');
  });
});

/**
 * 지지암장간(jijiAmjangan) 표기 회귀 테스트.
 * 실제로 화면에 노출되는 지장간은 SajuUtils.getJijiAmJangan()이 담당하는데, 未(미) 항목이
 * "丁己"(2글자, 을(乙) 누락)로 잘못돼 있었음. 未가 포함된 실제 사주(백서현, 1991-10-15 14:13)로 확인.
 */
describe('calculateSaju - 지지암장간(jijiAmjangan) 未 표기 회귀 테스트', () => {
  it('未가 포함된 사주에서 지장간이 丁乙己(3글자)로 나온다 (회귀 테스트: 예전엔 乙이 빠진 丁己만 나왔음)', () => {
    const r = calculateSaju({
      year: 1991, month: 10, day: 15, hour: 14, minute: 13,
      isLunar: false, isLeapMonth: false, gender: 0,
    });
    // 시주=기미, 년주=신미 - 둘 다 지지가 未
    expect(r.jijiAmjangan.timeAmjangan).toBe('丁乙己');
    expect(r.jijiAmjangan.yearAmjangan).toBe('丁乙己');
  });
});
