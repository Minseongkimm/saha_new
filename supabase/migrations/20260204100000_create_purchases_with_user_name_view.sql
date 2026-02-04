-- 기존 purchases 테이블에 user_name 컬럼 추가 (birth_info.name 저장용)
-- 뷰가 이미 있다면 제거 (이전 마이그레이션에서 뷰를 만든 경우)
DROP VIEW IF EXISTS purchases_with_user_name;

ALTER TABLE purchases ADD COLUMN IF NOT EXISTS user_name TEXT;

-- 기존 행에 birth_info.name으로 백필 (한 사용자당 여러 birth_info면 최신 created_at 기준)
UPDATE purchases p
SET user_name = (
  SELECT b.name
  FROM birth_info b
  WHERE b.user_id = p.user_id
  ORDER BY b.created_at DESC NULLS LAST
  LIMIT 1
);

COMMENT ON COLUMN purchases.user_name IS '구매 시점 사용자 이름 (birth_info.name)';
