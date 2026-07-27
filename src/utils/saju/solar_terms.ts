/// <reference path="../../types/lunar-javascript.d.ts" />
import { Solar } from 'lunar-javascript';

export interface SolarDateYmd {
  year: number;
  month: number;
  day: number;
}

/**
 * 주어진 연도의 입춘(立春) 날짜를 양력 YYYY-MM-DD 기준으로 반환합니다.
 * lunar-javascript의 절기(JieQi) 정보를 활용하며,
 * 예외 상황에서는 2월 4일을 입춘으로 간주합니다.
 */
export function getLichunYmd(year: number): SolarDateYmd {
  try {
    let solar = Solar.fromYmd(year, 2, 1);
    // 안전장치: 최대 40일까지만 탐색 (2월~3월 초 범위)
    for (let i = 0; i < 40; i += 1) {
      const lunar = solar.getLunar();
      const jieQi = lunar.getJieQi();
      if (jieQi === '立春') {
        const ymd = solar.toYmd().split('-');
        return {
          year: Number(ymd[0]),
          month: Number(ymd[1]),
          day: Number(ymd[2]),
        };
      }
      solar = solar.next(1);
    }
  } catch {
    // fall through to 기본값
  }

  // fallback: 2월 4일을 입춘으로 간주
  return {
    year,
    month: 2,
    day: 4,
  };
}

/**
 * 주어진 연도의 입춘(立春) 시점을 "해당 날짜의 KST 00:00"으로 보고,
 * 그 시각을 UTC 기준 ms로 반환합니다.
 */
export function getLichunKstMidnightUtcMs(year: number): number {
  const lichun = getLichunYmd(year);
  // KST 00:00 → UTC 기준으로 전날 15:00 이므로 9시간을 빼준다.
  return Date.UTC(lichun.year, lichun.month - 1, lichun.day) - 9 * 60 * 60 * 1000;
}

/**
 * 12 절기(소한·입춘·경칩·청명·입하·망종·소서·입추·백로·한로·입동·대설)를
 * 기준으로 월지(月支)의 인덱스를 반환합니다.
 *
 * 반환값: 0~11 (寅=0, 卯=1, ..., 丑=11)
 */
const JIEQI_TO_MONTH_BRANCH_INDEX: { [key: string]: number } = {
  // 1월: 小寒 → 丑월
  小寒: 11,
  // 2월: 立春 → 寅월
  立春: 0,
  // 3월: 惊蛰/驚蟄 → 卯월
  惊蛰: 1,
  驚蟄: 1,
  // 4월: 清明 → 辰월
  清明: 2,
  // 5월: 立夏 → 巳월
  立夏: 3,
  // 6월: 芒种/芒種 → 午월
  芒种: 4,
  芒種: 4,
  // 7월: 小暑 → 未월
  小暑: 5,
  // 8월: 立秋 → 申월
  立秋: 6,
  // 9월: 白露 → 酉월
  白露: 7,
  // 10월: 寒露 → 戌월
  寒露: 8,
  // 11월: 立冬 → 亥월
  立冬: 9,
  // 12월: 大雪 → 子월
  大雪: 10,
};

const SOLAR_TERM_DAY_APPROX: { [key: number]: number } = {
  1: 6,  // 小寒(1/6경)
  2: 4,  // 立春(2/4경)
  3: 6,  // 惊蛰(3/6경)
  4: 5,  // 清明(4/5경)
  5: 6,  // 立夏(5/6경)
  6: 6,  // 芒种(6/6경)
  7: 7,  // 小暑(7/7경)
  8: 8,  // 立秋(8/8경)
  9: 8,  // 白露(9/8경)
  10: 8, // 寒露(10/8경)
  11: 7, // 立冬(11/7경)
  12: 7, // 大雪(12/7경)
};

const BRANCH_AT_TERM_MONTH: { [key: number]: number } = {
  1: 11, // 小寒 → 丑월
  2: 0,  // 立春 → 寅월
  3: 1,  // 惊蛰 → 卯월
  4: 2,  // 清明 → 辰월
  5: 3,  // 立夏 → 巳월
  6: 4,  // 芒种 → 午월
  7: 5,  // 小暑 → 未월
  8: 6,  // 立秋 → 申월
  9: 7,  // 白露 → 酉월
  10: 8, // 寒露 → 戌월
  11: 9, // 立冬 → 亥월
  12: 10, // 大雪 → 子월
};

function getMonthBranchIndexFallback(year: number, month: number, day: number): number {
  let m = month;
  const d = day;
  const startDay = SOLAR_TERM_DAY_APPROX[m as keyof typeof SOLAR_TERM_DAY_APPROX];
  let targetMonth = m;
  if (startDay !== undefined && d < startDay) {
    targetMonth = m - 1;
    if (targetMonth <= 0) {
      targetMonth += 12;
    }
  }
  const branchIndex = BRANCH_AT_TERM_MONTH[targetMonth as keyof typeof BRANCH_AT_TERM_MONTH];
  return typeof branchIndex === 'number' ? branchIndex : 0;
}

export function getMonthBranchIndexBySolarTerms(year: number, month: number, day: number): number {
  try {
    let solar = Solar.fromYmd(year, month, day);
    // 최대 60일 뒤로 탐색 (가장 최근 절기를 찾기 위함)
    for (let i = 0; i < 60; i += 1) {
      const jieQi = solar.getLunar().getJieQi();
      if (jieQi && JIEQI_TO_MONTH_BRANCH_INDEX[jieQi] !== undefined) {
        return JIEQI_TO_MONTH_BRANCH_INDEX[jieQi];
      }
      solar = solar.next(-1);
    }
  } catch {
    // fall through to fallback
  }
  return getMonthBranchIndexFallback(year, month, day);
}

// lunar-javascript의 절기 시각은 북경시(UTC+8) 기준으로 계산되어 있음(라이브러리 내부 주석 "北京时间").
// KST(UTC+9)로 들어온 생일 시각을 그대로 넘기면 birthDate만 KST 값이 되어 절기 시각과 프레임이
// 어긋나므로(1시간 오차), 라이브러리에 넘기기 전 -1시간 보정하여 같은 기준시로 맞춘다.
const KST_TO_LIBRARY_OFFSET_MS = -60 * 60 * 1000;

/**
 * 생일로부터 순행(다음 절)/역행(이전 절)까지의 정밀 일수를 계산합니다.
 * 전통 대운수 계산 규칙(3일 = 1년)의 입력값으로 사용됩니다.
 * 주의: 24절기 전체가 아니라 월지를 정하는 "절(節)" 12개(입춘·경칩·청명·입하·망종·소서·
 * 입추·백로·한로·입동·대설·소한)만을 기준으로 한다. "기(氣)"(우수·춘분·곡우 등)는 대운수
 * 계산에서 제외해야 하며, 이를 섞으면 절 사이 간격(24일 전후)이 반토막 나서 대운수가 크게 틀어진다.
 * lunar-javascript의 분 단위 시각(subtractMinute)을 사용하므로 시/분까지 반영된 소수 일수를 반환합니다.
 */
export function getDaysToAdjacentSolarTerm(birthDate: Date, direction: 1 | -1): number {
  const birthSolar = Solar.fromDate(new Date(birthDate.getTime() + KST_TO_LIBRARY_OFFSET_MS));
  const lunar = birthSolar.getLunar();
  const jieQi = direction === 1 ? lunar.getNextJie(false) : lunar.getPrevJie(false);
  const termSolar = jieQi.getSolar();
  const minutes =
    direction === 1
      ? termSolar.subtractMinute(birthSolar)
      : birthSolar.subtractMinute(termSolar);
  return Math.abs(minutes) / (24 * 60);
}

