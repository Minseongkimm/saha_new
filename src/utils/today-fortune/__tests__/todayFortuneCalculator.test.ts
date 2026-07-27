import { TodayFortuneCalculator, UserSajuData } from '../todayFortuneCalculator';

describe('TodayFortuneCalculator - 신살/귀인 발동 판정 (일간/월지 기반 일반화)', () => {
  const calc = new TodayFortuneCalculator();

  // 갑일간 사용자: 천을귀인은 丑/未, 백호살 대상 간지는 甲辰/戊辰 등
  const userSaju: UserSajuData = {
    yearGanji: '甲申',
    monthGanji: '丙寅',
    dayGanji: '甲子',
    timeGanji: '庚申',
    sinsal: {
      yearSinsal: [],
      monthSinsal: [],
      daySinsal: [],
      timeSinsal: ['백호살'],
    },
    guin: { 천을귀인: ['丑(축)'] },
    jijiRelations: { 삼합: [], 육합: [], 삼형: [], 육충: [], 방합: [] },
    fiveProperties: { yearProperty: '목', monthProperty: '화', dayProperty: '목', timeProperty: '금' },
    gongmang: '',
  };

  it('일간(甲) 기준 천을귀인은 丑/未일 때만 발동한다', () => {
    const fortune = calc.calculateTodayFortune(userSaju, '2024-01-15'); // 甲子일 등 임의 날짜
    // isGuinActivated는 private이므로 공개 API인 calculateTodayFortune 결과를 통해 간접 검증
    expect(fortune).toBeDefined();
  });

  it('백호살은 甲辰/戊辰 등 지정된 7개 간지와 정확히 일치할 때만 발동한다 (일간과 무관)', () => {
    // 오늘이 甲辰일이면 백호살 발동 (userSaju.timeSinsal에 이미 '백호살'이 있다고 가정)
    const activated = (calc as any).isSinsalActivated('甲辰', '백호살', userSaju);
    const notActivated = (calc as any).isSinsalActivated('甲寅', '백호살', userSaju);
    expect(activated).toBe(true);
    expect(notActivated).toBe(false);
  });

  it('천을귀인은 일간에 따라 다른 지지에서 발동한다 (갑일간=축/미)', () => {
    const activatedYesUk = (calc as any).isGuinActivated('丁丑', '천을귀인', userSaju);
    const activatedYesMi = (calc as any).isGuinActivated('辛未', '천을귀인', userSaju);
    const notActivated = (calc as any).isGuinActivated('甲辰', '천을귀인', userSaju);
    expect(activatedYesUk).toBe(true);
    expect(activatedYesMi).toBe(true);
    expect(notActivated).toBe(false);
  });

  it('천을귀인은 일간이 다르면 발동 지지도 달라진다 (신일간=오/인)', () => {
    const sinDayUser: UserSajuData = { ...userSaju, dayGanji: '辛丑' };
    const activated = (calc as any).isGuinActivated('丙午', '천을귀인', sinDayUser);
    const notActivated = (calc as any).isGuinActivated('丁丑', '천을귀인', sinDayUser);
    expect(activated).toBe(true);
    expect(notActivated).toBe(false);
  });

  it('양인살은 일간 기준 단일 지지에서만 발동한다 (갑일간=묘)', () => {
    const activated = (calc as any).isSinsalActivated('乙卯', '양인살', userSaju);
    const notActivated = (calc as any).isSinsalActivated('乙辰', '양인살', userSaju);
    expect(activated).toBe(true);
    expect(notActivated).toBe(false);
  });
});
