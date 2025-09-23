import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Colors } from '../constants/colors';
import { 
  getElementFromBranch, 
  getElementFromStem,
} from '../constants/fiveElements';
import PillarCell from './PillarCell';

interface SajuData {
  name: string;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number;
  birthMinute: number;
  gender: string;
  calendarType: string;
  leapMonth?: boolean;
  timeUnknown?: boolean;
  calculatedSaju?: any;
  pillars?: any;
  tenGods?: any;
  lifeStages?: any;
}

interface SajuChartProps {
  sajuData: SajuData;
}

const SajuChart: React.FC<SajuChartProps> = ({ sajuData }) => {
  const formatBirthInfo = (data: SajuData) => {
    const year = data.birthYear;
    const month = data.birthMonth.toString().padStart(2, '0');
    const day = data.birthDay.toString().padStart(2, '0');
    const hour = data.birthHour.toString().padStart(2, '0');
    const minute = data.birthMinute.toString().padStart(2, '0');
    
    return `${year}년 ${month}월 ${day}일 ${hour}:${minute} (${data.gender === 'male' ? '남성' : '여성'})`;
  };

  // DB에서 가져온 계산된 사주 데이터 사용
  const getSajuFromData = (data: SajuData) => {
    if (!data.calculatedSaju) {
      return null; // DB에 데이터가 없으면 null 반환
    }

    const saju = data.calculatedSaju;
    
    // 실제 데이터 구조에 맞춰 파싱
    const parseGanji = (ganjiStr: string) => {
      if (!ganjiStr || ganjiStr.length < 2) return { heavenly: '', earthly: '', korean: '' };
      
      // 한글 간지에서 한자와 한글을 분리
      // 예: "임신" -> heavenly: "壬", earthly: "申", korean: "임신"
      const heavenlyStems: { [key: string]: string } = {
        '갑': '甲', '을': '乙', '병': '丙', '정': '丁', '무': '戊', '기': '己', '경': '庚', '신': '辛', '임': '壬', '계': '癸'
      };
      
      const earthlyBranches: { [key: string]: string } = {
        '자': '子', '축': '丑', '인': '寅', '묘': '卯', '진': '辰', '사': '巳', '오': '午', '미': '未', '신': '申', '유': '酉', '술': '戌', '해': '亥'
      };
      
      const heavenly = heavenlyStems[ganjiStr[0]] || '';
      const earthly = earthlyBranches[ganjiStr[1]] || '';
      const korean = ganjiStr;
      
      return { heavenly, earthly, korean };
    };

    const yearGanji = parseGanji(saju.yearHangulGanji || '');
    const monthGanji = parseGanji(saju.monthHangulGanji || '');
    const dayGanji = parseGanji(saju.dayHangulGanji || '');
    const timeGanji = parseGanji(saju.timeHangulGanji || '');

    // 천간과 지지의 정확한 오행 계산
    const getPillarElements = (ganji: any) => {
      const stemElement = getElementFromStem(ganji.heavenly);
      const branchElement = getElementFromBranch(ganji.earthly);
      return { stemElement, branchElement };
    };

    const yearElements = getPillarElements(yearGanji);
    const monthElements = getPillarElements(monthGanji);
    const dayElements = getPillarElements(dayGanji);
    const timeElements = getPillarElements(timeGanji);

    return {
      yearPillar: {
        ...yearGanji,
        stemElement: yearElements.stemElement,
        branchElement: yearElements.branchElement,
        element: yearElements.stemElement, // 기본적으로 천간 오행 사용
        property: yearElements.stemElement
      },
      monthPillar: {
        ...monthGanji,
        stemElement: monthElements.stemElement,
        branchElement: monthElements.branchElement,
        element: monthElements.stemElement,
        property: monthElements.stemElement
      },
      dayPillar: {
        ...dayGanji,
        stemElement: dayElements.stemElement,
        branchElement: dayElements.branchElement,
        element: dayElements.stemElement,
        property: dayElements.stemElement
      },
      hourPillar: {
        ...timeGanji,
        stemElement: timeElements.stemElement,
        branchElement: timeElements.branchElement,
        element: timeElements.stemElement,
        property: timeElements.stemElement
      },
      tenGods: {
        year: saju.stemSasin?.[3] || '', // 년주 십신
        month: saju.stemSasin?.[2] || '', // 월주 십신
        day: saju.stemSasin?.[1] || '', // 일주 십신 (일간)
        hour: saju.stemSasin?.[0] || '' // 시주 십신
      },
      branchSasin: saju.branchSasin || [],
      amjangan: saju.jijiAmjangan || {},
      sibun: saju.sibun || [] // 십이운성 데이터
    };
  };

  const saju = getSajuFromData(sajuData);

  // DB에 데이터가 없으면 데이터 없음 메시지 표시
  if (!saju) {
    return (
      <View style={styles.container}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{sajuData.name}</Text>
          <Text style={styles.userBirth}>{formatBirthInfo(sajuData)}</Text>
        </View>
        <View style={styles.noDataCard}>
          <Text style={styles.noDataTitle}>사주 데이터가 없습니다</Text>
          <Text style={styles.noDataDescription}>
            사주 정보를 입력하면 만세력 표를 확인할 수 있습니다
          </Text>
        </View>
      </View>
    );
  }


  return (
    <View style={styles.container}>
      {/* 사용자 정보 헤더 */}
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{sajuData.name}</Text>
        <Text style={styles.userBirth}>{formatBirthInfo(sajuData)}</Text>
      </View>

      {/* 만세력 표 */}
      <View style={styles.chartContainer}>
        {/* 표 헤더 */}
        <View style={styles.headerRow}>
          <View style={styles.headerCell}>
            <Text style={styles.headerText}>시주</Text>
          </View>
          <View style={styles.headerCell}>
            <Text style={styles.headerText}>일주</Text>
          </View>
          <View style={styles.headerCell}>
            <Text style={styles.headerText}>월주</Text>
          </View>
          <View style={styles.headerCell}>
            <Text style={styles.headerText}>년주</Text>
          </View>
        </View>

        {/* 천간 십신 행 */}
        <View style={styles.row}>
          <View style={styles.cell}>
            <Text style={styles.tenGodText}>{saju.tenGods.hour}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.tenGodText}>{saju.tenGods.day}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.tenGodText}>{saju.tenGods.month}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.tenGodText}>{saju.tenGods.year}</Text>
          </View>
        </View>

        {/* 천간 행 */}
        <View style={styles.row}>
          <PillarCell 
            pillarData={saju.hourPillar} 
            type="heavenly" 
          />
          <PillarCell 
            pillarData={saju.dayPillar} 
            type="heavenly" 
          />
          <PillarCell 
            pillarData={saju.monthPillar} 
            type="heavenly" 
          />
          <PillarCell 
            pillarData={saju.yearPillar} 
            type="heavenly" 
          />
        </View>

        {/* 지지 행 */}
        <View style={styles.row}>
          <PillarCell 
            pillarData={saju.hourPillar} 
            type="earthly" 
          />
          <PillarCell 
            pillarData={saju.dayPillar} 
            type="earthly" 
          />
          <PillarCell 
            pillarData={saju.monthPillar} 
            type="earthly" 
          />
          <PillarCell 
            pillarData={saju.yearPillar} 
            type="earthly" 
          />
        </View>

        {/* 지지 십신 행 */}
        <View style={styles.row}>
          <View style={styles.cell}>
            <Text style={styles.tenGodText}>{saju.branchSasin?.[0] || ''}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.tenGodText}>{saju.branchSasin?.[1] || ''}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.tenGodText}>{saju.branchSasin?.[2] || ''}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.tenGodText}>{saju.branchSasin?.[3] || ''}</Text>
          </View>
        </View>

        {/* 십이운성 행 */}
        <View style={styles.row}>
          <View style={styles.cell}>
            <Text style={styles.sibunText}>{saju.sibun?.[0] || ''}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.sibunText}>{saju.sibun?.[1] || ''}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.sibunText}>{saju.sibun?.[2] || ''}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.sibunText}>{saju.sibun?.[3] || ''}</Text>
          </View>
        </View>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fefefe',
    borderRadius: 16,
    padding: 20,
    marginTop: 15,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: '#f5f5f5',
    shadowColor: Colors.primaryColor,
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  userBirth: {
    fontSize: 14,
    color: '#666',
  },
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
  },
  row: {
    flexDirection: 'row',
  },
  headerCell: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderRightWidth: 0.5,
    borderLeftWidth: 0.5,
    borderRightColor: '#e0e0e0',
    borderLeftColor: '#e0e0e0',
  },
  cell: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.5,
    borderLeftWidth: 0.5,
    borderBottomWidth: 0.5,
    borderRightColor: '#e0e0e0',
    borderLeftColor: '#e0e0e0',
    borderBottomColor: '#e0e0e0',
    minHeight: 50,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  tenGodText: {
    fontSize: 12,
    color: '#666',
  },
  amjanganText: {
    fontSize: 10,
    color: '#888',
    textAlign: 'center',
  },
  sibunText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  noDataCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  noDataTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  noDataDescription: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default SajuChart;
