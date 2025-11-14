CREATE TABLE IF NOT EXISTS attendance (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('check-in', 'check-out', 'break-start', 'break-end')),
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attendance_user_id ON attendance(user_id);
CREATE INDEX idx_attendance_timestamp ON attendance(timestamp DESC);
CREATE INDEX idx_attendance_user_timestamp ON attendance(user_id, timestamp DESC);

ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE attendance IS '출퇴근 및 휴식 시간 기록 테이블';
COMMENT ON COLUMN attendance.user_id IS 'Google Chat 사용자 ID (users/xxx 형식)';
COMMENT ON COLUMN attendance.user_name IS '사용자 표시 이름';
COMMENT ON COLUMN attendance.type IS '기록 타입: check-in(출근), check-out(퇴근), break-start(휴식 시작), break-end(휴식 종료)';
COMMENT ON COLUMN attendance.timestamp IS '기록 시간';
