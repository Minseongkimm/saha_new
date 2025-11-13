import fs from 'fs';
import path from 'path';
import jwt, { SignOptions } from 'jsonwebtoken';
import {
  APPLE_AUTH_TEAM_ID,
  APPLE_AUTH_KEY_ID,
  APPLE_AUTH_CLIENT_ID,
  APPLE_AUTH_PRIVATE_KEY,
  APPLE_AUTH_PRIVATE_KEY_PATH,
  APPLE_AUTH_VALIDITY_DAYS,
  APPLE_AUTH_OUTPUT_PATH,
} from '../src/config/env';

interface AppleClientSecretConfig {
  teamId: string;
  keyId: string;
  clientId: string;
  privateKey: string;
  validityDurationInSeconds: number;
  outputPath?: string;
}

interface AppleClientSecretPayload {
  iss: string;
  iat: number;
  exp: number;
  aud: string;
  sub: string;
}

// 필수 환경변수 값이 비어 있는지 검증
const ensureNonEmpty = (value: string, label: string): string => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${label} is required.`);
  }
  return trimmed;
};

// 선택 입력값을 공백이면 undefined로 변환
const toOptional = (value: string): string | undefined => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  return trimmed;
};

// 프라이빗 키 문자열을 직접 사용하거나 파일 경로에서 로드
const resolvePrivateKey = (inlineKey: string | undefined, keyPath: string | undefined): string => {
  if (inlineKey && inlineKey.includes('-----BEGIN PRIVATE KEY-----')) {
    return inlineKey.replace(/\\n/g, '\n');
  }
  if (keyPath) {
    const absolutePath = path.resolve(keyPath);
    return fs.readFileSync(absolutePath, 'utf8');
  }
  throw new Error('Provide APPLE_AUTH_PRIVATE_KEY or APPLE_AUTH_PRIVATE_KEY_PATH in env.ts.');
};

// 유효 기간을 1~180일 범위로 제한
const clampValidityDays = (days: number): number => {
  const minimum = 1;
  const maximum = 180;
  if (!Number.isFinite(days) || days < minimum) {
    throw new Error('APPLE_AUTH_VALIDITY_DAYS must be a positive integer.');
  }
  if (days > maximum) {
    return maximum;
  }
  return days;
};

// 일 단위 입력을 초 단위로 변환
const parseValidity = (rawDays: number): number => {
  const normalizedDays = clampValidityDays(rawDays);
  return normalizedDays * 24 * 60 * 60;
};

// 스크립트 실행에 필요한 설정값을 env에서 추출
const buildConfig = (): AppleClientSecretConfig => {
  const teamId = ensureNonEmpty(APPLE_AUTH_TEAM_ID, 'APPLE_AUTH_TEAM_ID');
  const keyId = ensureNonEmpty(APPLE_AUTH_KEY_ID, 'APPLE_AUTH_KEY_ID');
  const clientId = ensureNonEmpty(APPLE_AUTH_CLIENT_ID, 'APPLE_AUTH_CLIENT_ID');
  const inlineKey = toOptional(APPLE_AUTH_PRIVATE_KEY);
  const keyPath = toOptional(APPLE_AUTH_PRIVATE_KEY_PATH);
  const privateKey = resolvePrivateKey(inlineKey, keyPath);
  const validityDurationInSeconds = parseValidity(APPLE_AUTH_VALIDITY_DAYS);
  const outputPath = toOptional(APPLE_AUTH_OUTPUT_PATH);
  return { teamId, keyId, clientId, privateKey, validityDurationInSeconds, outputPath };
};

// 설정값을 바탕으로 Apple client secret JWT 생성
const generateClientSecret = (config: AppleClientSecretConfig): string => {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: AppleClientSecretPayload = {
    iss: config.teamId,
    iat: issuedAt,
    exp: issuedAt + config.validityDurationInSeconds,
    aud: 'https://appleid.apple.com',
    sub: config.clientId,
  };
  const options: SignOptions = { algorithm: 'ES256', keyid: config.keyId };
  return jwt.sign(payload, config.privateKey, options);
};

// 생성된 토큰을 콘솔 출력하거나 파일 저장
const writeOutput = (token: string, outputPath?: string): void => {
  if (!outputPath) {
    console.log(token);
    return;
  }
  const absoluteOutputPath = path.resolve(outputPath);
  fs.writeFileSync(absoluteOutputPath, token, { encoding: 'utf8' });
  console.log(`Client secret saved to ${absoluteOutputPath}`);
};

// 엔트리 포인트: 설정 읽고 토큰 생성 후 출력
const main = (): void => {
  try {
    const config = buildConfig();
    const token = generateClientSecret(config);
    writeOutput(token, config.outputPath);
    const expiresInDays = Math.floor(config.validityDurationInSeconds / 86400);
    console.log(`✅ Generated client secret valid for ${expiresInDays} day(s).`);
  } catch (error) {
    console.error('❌ Failed to generate Apple client secret.');
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
};

main();

