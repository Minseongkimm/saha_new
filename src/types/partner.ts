/**
 * 상대방 사주 관련 타입 정의
 */

import { BirthInfo } from '../services/ai/types';

// 상대방 생년월일 정보 (BirthInputForm에서 사용하는 구조)
export interface PartnerBirthInfo {
  name: string;
  birthYear: string;
  birthMonth: string;
  birthDay: string;
  birthHour: string;
  birthMinute: string;
  gender: 'male' | 'female' | '';
  calendarType: 'solar' | 'lunar';
  isLeapMonth: boolean;
  isTimeUnknown: boolean;
  relationshipStatus?: RelationshipStatus;
}

// 관계 상태 타입
export type RelationshipStatus = 'dating' | 'married' | 'interested' | 'breakup' | 'other';

// 관계 상태 한글 매핑
export const RELATIONSHIP_STATUS_LABELS: Record<RelationshipStatus, string> = {
  dating: '연애중',
  married: '부부',
  interested: '관심',
  breakup: '이별',
  other: '기타'
};

// 상대방 정보 (입력용)
export interface PartnerInput {
  partnerName: string;
  relationshipStatus: RelationshipStatus;
  birthInfo: BirthInfo;
}

// 상대방 사주 정보 (DB 저장용)
export interface PartnerSaju {
  id: string;
  userId: string;
  partnerName: string;
  relationshipStatus: RelationshipStatus;
  birthInfo: BirthInfo;
  sajuData?: any; // 사주 분석 결과
  createdAt: string;
  updatedAt: string;
}

// 상대방 사주 정보 (UI 표시용)
export interface PartnerSajuDisplay {
  id: string;
  partnerName: string;
  relationshipStatus: RelationshipStatus;
  relationshipStatusLabel: string;
  birthInfo: BirthInfo;
  sajuData?: any;
  createdAt: string;
}

// 상대방 정보 저장 요청
export interface SavePartnerRequest {
  partnerName: string;
  relationshipStatus: RelationshipStatus;
  birthInfo: BirthInfo;
}

// 상대방 정보 업데이트 요청
export interface UpdatePartnerRequest {
  id: string;
  partnerName?: string;
  relationshipStatus?: RelationshipStatus;
  birthInfo?: BirthInfo;
}
