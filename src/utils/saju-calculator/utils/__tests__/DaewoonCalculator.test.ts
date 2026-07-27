import { DaewoonCalculator } from '../DaewoonCalculator';

describe('DaewoonCalculator', () => {
  const calc = new DaewoonCalculator();

  // 2024년 입춘 실제 시각: 2024-02-04 17:27 KST
  const IPCHUN_2024_KST = new Date(2024, 1, 4, 17, 27, 0);

  describe('getDaewoonDirection (순행/역행 판정: 양남음녀 순행, 음남양녀 역행)', () => {
    it('양간(甲) 연주 + 남자(0) → 순행(1)', () => {
      expect(calc.getDaewoonDirection('甲子', 0)).toBe(1);
    });
    it('양간(甲) 연주 + 여자(1) → 역행(-1)', () => {
      expect(calc.getDaewoonDirection('甲子', 1)).toBe(-1);
    });
    it('음간(乙) 연주 + 남자(0) → 역행(-1)', () => {
      expect(calc.getDaewoonDirection('乙丑', 0)).toBe(-1);
    });
    it('음간(乙) 연주 + 여자(1) → 순행(1)', () => {
      expect(calc.getDaewoonDirection('乙丑', 1)).toBe(1);
    });
  });

  describe('calculateFirstAge (대운수 = 절기까지 일수 ÷ 3, 3일=1년, 나머지 8개월 이상만 올림)', () => {
    // 삼명통회 기준 전통 대운 계산법 - 사주매니아 FAQ(https://sajumania.com)에 실제 예제와 함께
    // 명문화되어 있음: "대운수가 8개월 이상이면 반올림하고 8개월 이하이면 올림하지 않는다"
    // (단순 반올림이 아니라 8개월을 기준으로 한 비대칭 규칙 - 3일=1년이므로 8개월 = 2일에 해당)
    it('다음 절기까지 정확히 3일이면 대운수 1', () => {
      const birth = new Date(IPCHUN_2024_KST.getTime() - 3 * 24 * 60 * 60 * 1000);
      expect(calc.calculateFirstAge(birth, 1)).toBe(1);
    });

    it('다음 절기까지 정확히 12일이면 대운수 4', () => {
      const birth = new Date(IPCHUN_2024_KST.getTime() - 12 * 24 * 60 * 60 * 1000);
      expect(calc.calculateFirstAge(birth, 1)).toBe(4);
    });

    it('위키백과 예시(1950-06-25 출생, 소서까지 약 12~13일 → 대운수 4)와 동일한 산출 범위를 재현한다', () => {
      const birth = new Date(1950, 5, 25, 0, 0, 0);
      const age = calc.calculateFirstAge(birth, 1);
      expect(age).toBe(4);
    });

    it('나머지가 2일(8개월) 이상이면 올림, 미만이면 버림', () => {
      // 다음 절기까지 5일 → 1년(3일) + 나머지 2일(=8개월) → 8개월 이상이므로 올림 → 2
      const birth5 = new Date(IPCHUN_2024_KST.getTime() - 5 * 24 * 60 * 60 * 1000);
      expect(calc.calculateFirstAge(birth5, 1)).toBe(2);

      // 다음 절기까지 4일 → 1년(3일) + 나머지 1일(=4개월) → 8개월 미만이므로 버림 → 1
      const birth4 = new Date(IPCHUN_2024_KST.getTime() - 4 * 24 * 60 * 60 * 1000);
      expect(calc.calculateFirstAge(birth4, 1)).toBe(1);
    });

    it('사주매니아 FAQ 예제 그대로 재현: 4년6월1일 → 대운수 4 (6개월 < 8개월, 올림 안 함)', () => {
      // 4년 6개월 1일 ≈ 4.503년 → 3일=1년 환산 시 약 13.51일
      const days = 4 * 3 + (6 / 12) * 3 + (1 / 360) * 3;
      const birth = new Date(IPCHUN_2024_KST.getTime() - days * 24 * 60 * 60 * 1000);
      expect(calc.calculateFirstAge(birth, 1)).toBe(4);
    });

    it('사주매니아 FAQ 예제 그대로 재현: 1년10월7일 → 대운수 2 (10개월 ≥ 8개월, 올림)', () => {
      const days = 1 * 3 + (10 / 12) * 3 + (7 / 360) * 3;
      const birth = new Date(IPCHUN_2024_KST.getTime() - days * 24 * 60 * 60 * 1000);
      expect(calc.calculateFirstAge(birth, 1)).toBe(2);
    });

    it('나머지가 8개월 미만이면 정수 부분이 0이어도 대운수 0이 나올 수 있다 (허세수 개념)', () => {
      // 절기까지 1.9일 → 8개월(2일) 미만이므로 버림 → 0
      const birth = new Date(IPCHUN_2024_KST.getTime() - 1.9 * 24 * 60 * 60 * 1000);
      expect(calc.calculateFirstAge(birth, 1)).toBe(0);
    });
  });

  describe('calculateAccurateDaewoon (하드코딩된 9세가 아니라 실제 절기 기반 나이를 사용해야 함)', () => {
    it('대운수가 항상 9로 고정되지 않는다 (회귀 테스트: 예전 버그)', () => {
      const birth = new Date(IPCHUN_2024_KST.getTime() - 3 * 24 * 60 * 60 * 1000);
      const list = calc.calculateAccurateDaewoon('甲子', '丙寅', 2024, 0, birth);
      expect(list[0].age).not.toBe(9);
      expect(list[0].age).toBe(1);
    });

    it('같은 생년월일이라도 성별이 다르면 대운 방향(순행/역행)이 달라진다 (회귀 테스트: 예전엔 gender가 항상 0으로 고정됐음)', () => {
      const birth = new Date(IPCHUN_2024_KST.getTime() - 6 * 24 * 60 * 60 * 1000);
      // 甲(양간) 연주 - 남자는 순행, 여자는 역행
      const male = calc.calculateAccurateDaewoon('甲子', '丙寅', 2024, 0, birth);
      const female = calc.calculateAccurateDaewoon('甲子', '丙寅', 2024, 1, birth);
      expect(male[0].ganji).not.toBe(female[0].ganji);
      // 순행(男)은 월주 다음 간지, 역행(女)은 월주 이전 간지여야 한다
      expect(male[0].ganji).toBe('丁卯');
      expect(female[0].ganji).toBe('乙丑');
    });

    it('10년 간격으로 60갑자를 순행/역행하며 진행한다', () => {
      const birth = new Date(IPCHUN_2024_KST.getTime() - 3 * 24 * 60 * 60 * 1000);
      const list = calc.calculateAccurateDaewoon('甲子', '丙寅', 2024, 0, birth);
      expect(list).toHaveLength(12);
      for (let i = 1; i < list.length; i++) {
        expect(list[i].age - list[i - 1].age).toBe(10);
      }
    });
  });
});
