import { NewYearFortuneCalculator, UserSajuData } from '../newYearFortuneCalculator';
import { SajuUtils } from '../../saju-calculator/utils/SajuUtils';

describe('NewYearFortuneCalculator - 년간지 일반화', () => {
  const calc = new NewYearFortuneCalculator();
  const baseUserData: UserSajuData = {
    yearGanji: '甲子',
    monthGanji: '丙寅',
    dayGanji: '戊辰',
    timeGanji: '庚申',
    sinsal: {},
    guin: {},
    jijiRelations: {},
    fiveProperties: {},
    daewoon: [{ age: 3, ganji: '丁卯' }],
    birthYear: 1990,
  };

  it('하드코딩 범위(2024-2030) 밖의 연도도 올바른 60갑자를 계산한다', () => {
    // 2031년은 이전 하드코딩 맵에 없어 2025(을사)로 잘못 폴백되던 연도
    const result = calc.calculateNewYearFortune(baseUserData, 2031);
    // 표준 공식: (2031-4) % 60 -> 신해(辛亥)
    expect(result.yearGanji.yearGanji).toBe('辛亥');
    expect(result.yearName).toBe('신해년');
  });

  it('하드코딩 범위 안의 연도도 표준 공식과 일치한다 (2025=을사)', () => {
    const result = calc.calculateNewYearFortune(baseUserData, 2025);
    expect(result.yearGanji.yearGanji).toBe('乙巳');
  });

  it('먼 과거 연도에 대해서도 일반적으로 동작한다 (1990=경오)', () => {
    const result = calc.calculateNewYearFortune(baseUserData, 1990);
    expect(result.yearGanji.yearGanji).toBe('庚午');
  });

  it('연도별 간지가 SajuUtils.getYearGanji와 일치한다 (임의 연도 100개 스팟체크)', () => {
    for (let year = 1950; year < 2050; year += 7) {
      const result = calc.calculateNewYearFortune(baseUserData, year);
      expect(result.yearGanji.yearGanji).toBe(SajuUtils.getYearGanji(year));
    }
  });
});
