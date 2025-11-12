export const config = {
  supabase: {
    url: process.env.SUPABASE_URL || '',
    key: process.env.SUPABASE_KEY || '',
  },
  googleChat: {
    dailyScrumWebhookUrl: process.env.GOOGLE_CHAT_DAILY_SCRUM_WEBHOOK_URL || '',
    attendanceWebhookUrl: process.env.GOOGLE_CHAT_ATTENDANCE_WEBHOOK_URL || '',
  },
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
  },
};

export function validateConfig(): void {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'GOOGLE_CHAT_DAILY_SCRUM_WEBHOOK_URL',
    'GOOGLE_CHAT_ATTENDANCE_WEBHOOK_URL',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}
