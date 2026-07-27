import { BanghapCalculator } from '../BanghapCalculator';

describe('BanghapCalculator', () => {
  const calc = new BanghapCalculator();

  describe('analyzeBanghapStrength (전체 지지 분석)', () => {
    it('삼합이 온전히 갖춰진 경우 삼합으로 분류한다 (申子辰 수국)', () => {
      const result = calc.analyzeBanghapStrength(['庚申', '丙子', '戊辰', '甲寅']);
      expect(result.samhap.some(s => s.includes('수국'))).toBe(true);
      expect(result.banhap).toHaveLength(0);
    });

    it('삼합 중 두 글자만 있으면 반합으로 분류한다', () => {
      const result = calc.analyzeBanghapStrength(['庚申', '丙子', '戊午', '甲寅']);
      expect(result.samhap).toHaveLength(0);
      expect(result.banhap.some(s => s.includes('수국'))).toBe(true);
    });

    it('방합(계절 방위국)을 올바르게 판정한다 (寅卯辰 동방목국)', () => {
      const result = calc.analyzeBanghapStrength(['甲寅', '乙卯', '丙辰', '丁巳']);
      expect(result.banghap.some(s => s.includes('동방목국'))).toBe(true);
    });

    it('육충 관계를 육충으로 분류하고 방합으로 잘못 분류하지 않는다 (子午 충)', () => {
      const result = calc.analyzeBanghapStrength(['甲子', '乙丑', '丙午', '丁未']);
      expect(result.yukchung.some(s => s.includes('子') && s.includes('午'))).toBe(true);
      expect(result.banghap.some(s => s.includes('子') && s.includes('午'))).toBe(false);
    });

    it('육합 관계를 정확히 판정한다 (子丑)', () => {
      const result = calc.analyzeBanghapStrength(['甲子', '乙丑', '丙寅', '丁卯']);
      expect(result.yukhap.some(s => s.includes('子') && s.includes('丑'))).toBe(true);
    });

    it('삼형(자형)을 판정한다 (辰辰)', () => {
      const result = calc.analyzeBanghapStrength(['甲辰', '乙丑', '丙辰', '丁卯']);
      expect(result.samhyeong.some(s => s.includes('자형'))).toBe(true);
    });

    it('육충이 있으면 totalStrength가 음수 방향으로 감점된다', () => {
      const chungOnly = calc.analyzeBanghapStrength(['甲子', '丙午']);
      expect(chungOnly.totalStrength).toBeLessThan(0);
    });
  });

  describe('calculateBanghap (두 간지 간 관계)', () => {
    it('육충 관계를 감지한다', () => {
      const result = calc.calculateBanghap('甲子', '丙午');
      expect(result?.type).toBe('육충');
      expect(result?.strength).toBeLessThan(0);
    });

    it('방합 관계를 감지한다', () => {
      const result = calc.calculateBanghap('甲寅', '乙卯');
      expect(result?.type).toContain('방합');
    });

    it('아무 관계가 없으면 null을 반환한다 (寅-酉)', () => {
      const result = calc.calculateBanghap('甲寅', '癸酉');
      expect(result).toBeNull();
    });
  });
});
