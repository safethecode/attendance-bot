CREATE TABLE IF NOT EXISTS logs (
  id BIGSERIAL PRIMARY KEY,
  method TEXT NOT NULL,
  url TEXT,
  headers JSONB,
  body TEXT,
  body_json JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_logs_created_at ON logs(created_at DESC);

ALTER TABLE logs DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE logs IS '디버깅용 요청 로그 테이블';
COMMENT ON COLUMN logs.method IS 'HTTP 메소드 (GET, POST, etc)';
COMMENT ON COLUMN logs.body IS '원본 body 텍스트';
COMMENT ON COLUMN logs.body_json IS '파싱된 JSON (가능한 경우)';
COMMENT ON COLUMN logs.error IS '에러 메시지 (있는 경우)';
