# 데이터베이스 설정 가이드

## 무료 대화 기능 설정

### 1. 무료 대화 테이블 생성

```sql
-- 무료 대화 사용 내역 테이블
CREATE TABLE IF NOT EXISTS free_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  used_date DATE NOT NULL DEFAULT CURRENT_DATE,
  chat_room_id UUID,
  user_message_id UUID,  -- 사용자가 보낸 메시지 ID (chat_messages 테이블 참조)
  ai_message_id UUID,     -- AI 응답 메시지 ID (chat_messages 테이블 참조)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 추가 (조회 성능)
CREATE INDEX IF NOT EXISTS idx_free_messages_user_date 
ON free_messages(user_id, used_date);

-- 무료 대화 정책 설정 테이블
CREATE TABLE IF NOT EXISTS free_message_policy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_free_count INTEGER NOT NULL DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(id)
);

-- 초기 값 삽입
INSERT INTO free_message_policy (daily_free_count, enabled)
VALUES (1, true)
ON CONFLICT DO NOTHING;
```

### 2. RLS (Row Level Security) 정책 설정

```sql
-- free_messages 테이블 RLS 활성화
ALTER TABLE free_messages ENABLE ROW LEVEL SECURITY;

-- free_messages: 사용자는 자신의 레코드만 읽기 가능
CREATE POLICY "Users can view their own free messages"
ON free_messages
FOR SELECT
USING (auth.uid() = user_id);

-- free_messages: 사용자는 자신의 레코드만 삽입 가능
CREATE POLICY "Users can insert their own free messages"
ON free_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- free_messages: 사용자는 자신의 레코드만 업데이트 가능
CREATE POLICY "Users can update their own free messages"
ON free_messages
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- free_message_policy 테이블 RLS 활성화
ALTER TABLE free_message_policy ENABLE ROW LEVEL SECURITY;

-- free_message_policy: 모든 인증된 사용자가 읽기 가능 (정책 조회용)
CREATE POLICY "Authenticated users can read policy"
ON free_message_policy
FOR SELECT
TO authenticated
USING (true);

-- free_message_policy: 쓰기는 SERVICE_ROLE만 가능 (관리자용)
-- 별도 정책 없음 (Edge Function에서 SERVICE_ROLE_KEY 사용)
```

## 정책 변경 방법

### 무료 대화 개수 변경
```sql
UPDATE free_message_policy 
SET daily_free_count = 3,  -- 3개로 변경
    updated_at = NOW();
```

### 무료 대화 비활성화
```sql
UPDATE free_message_policy 
SET enabled = false,
    updated_at = NOW();
```

### 무료 대화 다시 활성화
```sql
UPDATE free_message_policy 
SET enabled = true,
    updated_at = NOW();
```

## 전체 흐름

1. **사용자 메시지 전송**
   - 클라이언트에서 `chat_messages` 테이블에 사용자 메시지 INSERT
   - INSERT된 메시지의 `id`를 `user_message_id`로 저장

2. **Edge Function 호출**
   - `chat-stream` Edge Function에 `userMessageId` 전달
   - Edge Function에서 무료 대화 또는 잔액 체크 및 차감
   - 무료 대화 사용 시 `free_messages` 테이블에 `user_message_id` 포함하여 INSERT

3. **AI 응답 저장 후**
   - 클라이언트에서 AI 메시지 INSERT 후 `id` 획득
   - `free_messages` 테이블의 해당 레코드에 `ai_message_id` 업데이트

이제 `free_messages` 테이블에서 어떤 사용자 메시지와 AI 응답이 무료 대화였는지 추적 가능합니다.

