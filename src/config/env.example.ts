// 환경변수 예시 파일
// 실제 사용시에는 이 파일을 복사하여 env.ts로 이름을 변경하고 실제 값들을 입력하세요

export const OPENAI_API_KEY = "your_openai_api_key_here"; // 예) sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
export const SUPABASE_URL = "your_supabase_url_here"; // 예) https://abcd1234.supabase.co
export const SUPABASE_ANON_KEY = "your_supabase_publishable_key_here"; // Supabase anon/publishable key

export const APPLE_AUTH_TEAM_ID = ""; // 예) ABCDE12345
export const APPLE_AUTH_KEY_ID = ""; // 예) 1A2BC3DEF4
export const APPLE_AUTH_CLIENT_ID = ""; // 예) com.yourcompany.yourapp.service
export const APPLE_AUTH_PRIVATE_KEY = ""; // .p8 키를 직접 문자열로 넣을 경우 사용 (줄바꿈은 \n)
export const APPLE_AUTH_PRIVATE_KEY_PATH = ""; // .p8 파일 경로
export const APPLE_AUTH_VALIDITY_DAYS = 180; // 1~180 사이, 기본 180
export const APPLE_AUTH_OUTPUT_PATH = ""; // JWT를 파일로 저장할 경로 (미지정 시 콘솔 출력)
