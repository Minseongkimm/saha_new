declare module 'lunar-javascript' {
  export class Lunar {
    getJieQi(): string | null;
  }

  export class Solar {
    static fromYmd(year: number, month: number, day: number): Solar;
    getLunar(): Lunar;
    next(days: number): Solar;
    toYmd(): string;
  }
}


