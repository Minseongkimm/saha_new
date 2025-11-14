import { SajuResult } from './ganji_local';

/**
 * SajuResult를 calculated_saju 테이블 형식으로 변환
 */
export const convertSajuResultToDbFormat = (sajuResult: SajuResult) => {
  return {
    year_hangul_ganji: sajuResult.yearHangulGanji || null,
    month_hangul_ganji: sajuResult.monthHangulGanji || null,
    day_hangul_ganji: sajuResult.dayHangulGanji || null,
    time_hangul_ganji: sajuResult.timeHangulGanji || null,
    stem_sasin: sajuResult.stemSasin || [],
    branch_sasin: sajuResult.branchSasin || [],
    sibun: sajuResult.sibun || [],
    gongmang: sajuResult.gongmang || null,
    five_properties: sajuResult.fiveProperties || {},
    sinsal: sajuResult.sinsal || {},
    guin: sajuResult.guin || {},
    jiji_amjangan: sajuResult.jijiAmjangan || {},
    jiji_relations: sajuResult.jijiRelations || {},
    sal: sajuResult.sal || {},
    daewoon: sajuResult.daewoon || [],
  };
};

/**
 * calculated_saju 테이블 데이터를 SajuResult 형식으로 변환
 */
export const convertDbFormatToSajuResult = (dbData: any): SajuResult => {
  return {
    yearHangulGanji: dbData.year_hangul_ganji || '',
    monthHangulGanji: dbData.month_hangul_ganji || '',
    dayHangulGanji: dbData.day_hangul_ganji || '',
    timeHangulGanji: dbData.time_hangul_ganji || '',
    stemSasin: dbData.stem_sasin || [],
    branchSasin: dbData.branch_sasin || [],
    sibun: dbData.sibun || [],
    gongmang: dbData.gongmang || '',
    fiveProperties: dbData.five_properties || {},
    sinsal: dbData.sinsal || {},
    guin: dbData.guin || {},
    jijiAmjangan: dbData.jiji_amjangan || {},
    jijiRelations: dbData.jiji_relations || {},
    sal: dbData.sal || {},
    daewoon: dbData.daewoon || [],
  };
};

