declare module 'lunar-javascript' {
  export class JieQi {
    getName(): string;
    getSolar(): Solar;
  }

  export class Lunar {
    getJieQi(): string | null;
    getNextJieQi(wholeDay?: boolean): JieQi;
    getPrevJieQi(wholeDay?: boolean): JieQi;
    // "절(節)" 12개(입춘·경칩·청명 등 월지를 정하는 절기)만 대상으로 탐색 - "기(氣)"(우수·춘분 등)는 제외.
    // 대운수 계산은 전통적으로 이 12개 절만을 기준으로 한다.
    getNextJie(wholeDay?: boolean): JieQi;
    getPrevJie(wholeDay?: boolean): JieQi;
  }

  export class Solar {
    static fromYmd(year: number, month: number, day: number): Solar;
    static fromDate(date: Date): Solar;
    getLunar(): Lunar;
    next(days: number): Solar;
    toYmd(): string;
    getHour(): number;
    getMinute(): number;
    getSecond(): number;
    // Whole calendar days between two Solar instants (integer, ignores time-of-day).
    subtract(solar: Solar): number;
    // Precise minute difference between two Solar instants (accounts for time-of-day).
    subtractMinute(solar: Solar): number;
  }
}


