/// <reference path="./deno.d.ts" />

// @ts-ignore: Deno module
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface AttendanceRecord {
  id?: number;
  user_id: string;
  user_name: string;
  type: 'check-in' | 'check-out' | 'break-start' | 'break-end';
  timestamp: string;
  created_at?: string;
}

interface WorkingHoursResult {
  totalHours: number;
  totalMinutes: number;
  workingHours: number;
  workingMinutes: number;
  breakHours: number;
  breakMinutes: number;
}

interface GoogleChatEvent {
  chat?: {
    user?: {
      name: string;
      displayName: string;
      email: string;
    };
    appCommandPayload?: {
      message?: {
        text?: string;
        sender?: {
          name: string;
          displayName: string;
          email: string;
        };
        slashCommand?: {
          commandId?: number;
          commandName?: string;
        };
      };
      space?: {
        name: string;
        displayName?: string;
      };
    };
  };
  commonEventObject?: {
    userLocale?: string;
    hostApp?: string;
  };
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const attendanceWebhookUrl = "https://chat.googleapis.com/v1/spaces/AAQAyatYXS0/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=9siLN2_f905YiwFrMUpNKnwaQw9Holu5Qn4qUtgW6qw";

async function saveAttendance(record: AttendanceRecord) {
  const { data, error } = await supabase.from('attendance').insert([record]).select();
  if (error) throw error;
  return data;
}

async function getLastRecord(userId: string): Promise<AttendanceRecord | null> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(1);

  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
}

async function getTodayAttendance(userId: string): Promise<AttendanceRecord[]> {
  const todayString = getKoreaTodayStart();

  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('user_id', userId)
    .gte('timestamp', todayString)
    .order('timestamp', { ascending: true });

  if (error) throw error;
  return data || [];
}

function calculateWorkingHours(records: AttendanceRecord[]): WorkingHoursResult {
  let totalMs = 0;
  let breakMs = 0;

  let currentCheckIn: Date | null = null;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    if (record.type === 'check-in') {
      currentCheckIn = new Date(record.timestamp);
    } else if (record.type === 'check-out' && currentCheckIn) {
      const checkOutTime = new Date(record.timestamp);
      totalMs += checkOutTime.getTime() - currentCheckIn.getTime();
      currentCheckIn = null;
    } else if (record.type === 'break-start') {
      const breakStart = new Date(record.timestamp);
      for (let j = i + 1; j < records.length; j++) {
        if (records[j].type === 'break-end') {
          const breakEnd = new Date(records[j].timestamp);
          breakMs += breakEnd.getTime() - breakStart.getTime();
          break;
        }
      }
    }
  }

  const workingMs = totalMs - breakMs;

  return {
    totalHours: Math.floor(totalMs / (1000 * 60 * 60)),
    totalMinutes: Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60)),
    workingHours: Math.floor(workingMs / (1000 * 60 * 60)),
    workingMinutes: Math.floor((workingMs % (1000 * 60 * 60)) / (1000 * 60)),
    breakHours: Math.floor(breakMs / (1000 * 60 * 60)),
    breakMinutes: Math.floor((breakMs % (1000 * 60 * 60)) / (1000 * 60)),
  };
}

function getKoreaTodayStart(): string {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const dateStr = formatter.format(now);

  const koreaDate = new Date(dateStr + 'T00:00:00+09:00');

  return koreaDate.toISOString();
}

function formatTime(timestamp: Date): string {
  return timestamp.toLocaleTimeString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

function formatDate(timestamp: Date): string {
  return timestamp.toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
}

function createCheckInCard(userName: string, timestamp: Date) {
  return {
    text: `✅ 출근 완료! ${userName}님, 좋은 하루 되세요!`,
    cardsV2: [{
      cardId: 'check-in-card',
      card: {
        name: 'Check-in Card',
        header: {
          title: '✅ 출근 완료',
          subtitle: '좋은 하루 되세요!',
          imageUrl: 'https://avatars.githubusercontent.com/u/179722555?s=200&v=4',
          imageType: 'CIRCLE'
        },
        sections: [{
          widgets: [
            {
              decoratedText: {
                topLabel: '출근 시간',
                text: `<b>${formatTime(timestamp)}</b>`,
                startIcon: {
                  knownIcon: 'CLOCK'
                }
              }
            },
            {
              decoratedText: {
                topLabel: '날짜',
                text: formatDate(timestamp),
                startIcon: {
                  knownIcon: 'EVENT_SEAT'
                }
              }
            },
            {
              textParagraph: {
                text: `<font color="#34A853">${userName}님, 오늘도 화이팅! 💪</font>`
              }
            }
          ]
        }]
      }
    }]
  };
}

function createCheckOutCard(userName: string, timestamp: Date, workingHours: WorkingHoursResult) {
  return {
    text: `👋 퇴근 완료! ${userName}님, 오늘 하루 고생 많으셨습니다! 총 근무시간: ${workingHours.workingHours}시간 ${workingHours.workingMinutes}분`,
    cardsV2: [{
      cardId: 'check-out-card',
      card: {
        name: 'Check-out Card',
        header: {
          title: '👋 퇴근 완료',
          subtitle: '수고하셨습니다!',
          imageUrl: 'https://avatars.githubusercontent.com/u/179722555?s=200&v=4',
          imageType: 'CIRCLE'
        },
        sections: [{
          widgets: [
            {
              decoratedText: {
                topLabel: '퇴근 시간',
                text: `<b>${formatTime(timestamp)}</b>`,
                startIcon: {
                  knownIcon: 'CLOCK'
                }
              }
            },
            {
              decoratedText: {
                topLabel: '총 근무 시간',
                text: `<b><font color="#EA4335">${workingHours.workingHours}시간 ${workingHours.workingMinutes}분</font></b>`,
                startIcon: {
                  knownIcon: 'STAR'
                }
              }
            },
            {
              decoratedText: {
                topLabel: '휴식 시간',
                text: `${workingHours.breakHours}시간 ${workingHours.breakMinutes}분`,
                startIcon: {
                  knownIcon: 'HOTEL'
                }
              }
            },
            {
              textParagraph: {
                text: `<font color="#FBBC04">${userName}님, 오늘 하루도 고생 많으셨습니다! 🎉</font>`
              }
            }
          ]
        }]
      }
    }]
  };
}

function createBreakStartCard(userName: string, timestamp: Date) {
  return {
    text: `☕ 휴식 시작! ${userName}님, 푹 쉬세요!`,
    cardsV2: [{
      cardId: 'break-start-card',
      card: {
        name: 'Break Start Card',
        header: {
          title: '☕ 휴식 시작',
          subtitle: '잠시 쉬어가세요',
          imageUrl: 'https://avatars.githubusercontent.com/u/179722555?s=200&v=4',
          imageType: 'CIRCLE'
        },
        sections: [{
          widgets: [
            {
              decoratedText: {
                topLabel: '휴식 시작',
                text: `<b>${formatTime(timestamp)}</b>`,
                startIcon: {
                  knownIcon: 'CLOCK'
                }
              }
            },
            {
              textParagraph: {
                text: `<font color="#FBBC04">${userName}님, 푹 쉬세요! 😴</font>`
              }
            },
            {
              textParagraph: {
                text: '<i>업무 재개는 /출근 명령어를 입력하세요</i>'
              }
            }
          ]
        }]
      }
    }]
  };
}

function createBreakEndCard(userName: string, timestamp: Date) {
  return {
    text: `💼 업무 재개! ${userName}님, 힘내세요!`,
    cardsV2: [{
      cardId: 'break-end-card',
      card: {
        name: 'Break End Card',
        header: {
          title: '💼 업무 재개',
          subtitle: '다시 힘내봅시다!',
          imageUrl: 'https://avatars.githubusercontent.com/u/179722555?s=200&v=4',
          imageType: 'CIRCLE'
        },
        sections: [{
          widgets: [
            {
              decoratedText: {
                topLabel: '업무 재개',
                text: `<b>${formatTime(timestamp)}</b>`,
                startIcon: {
                  knownIcon: 'CLOCK'
                }
              }
            },
            {
              textParagraph: {
                text: `<font color="#4285F4">${userName}님, 힘내세요! 💪</font>`
              }
            }
          ]
        }]
      }
    }]
  };
}

function sendToGoogleChat(message: any) {
  if (!attendanceWebhookUrl) {
    return;
  }

  fetch(attendanceWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  }).catch(error => {
    console.error('Failed to send to Google Chat:', error);
  });
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });
}

async function saveRequestLog(req: Request, text: string, bodyJson: any = null, error: string | null = null) {
  try {
    const headers: any = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });

    await supabase.from('logs').insert([{
      method: req.method,
      url: req.url,
      headers: headers,
      body: text,
      body_json: bodyJson,
      error: error,
    }]);
  } catch (logError) {
    console.error('Failed to save log:', logError);
  }
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === 'GET' || req.method === 'HEAD') {
      return jsonResponse({ status: 'ok' });
    }

    const text = await req.text();

    if (!text || text.trim() === '') {
      await saveRequestLog(req, text, null, 'Empty body');
      return jsonResponse({ status: 'ok' });
    }

    let event: GoogleChatEvent;
    try {
      event = JSON.parse(text);
      await saveRequestLog(req, text, event, null);
    } catch (parseError) {
      await saveRequestLog(req, text, null, String(parseError));
      return jsonResponse({ status: 'ok' });
    }

    const chat = event.chat;
    if (!chat || !chat.appCommandPayload) {
      return jsonResponse({ status: 'ok' });
    }

    const message = chat.appCommandPayload.message;
    if (!message) {
      return jsonResponse({ status: 'ok' });
    }

    const user = chat.user || message.sender;
    if (!user) {
      return jsonResponse({ status: 'ok' });
    }

    const userId = user.name;
    const userName = user.displayName;
    const messageText = message.text?.trim() || '';

    const commandName = message.slashCommand?.commandName || messageText;

    if (commandName === '/출근') {
      try {
        const lastRecord = await getLastRecord(userId);

        const isOnBreak = lastRecord?.type === 'break-start';
        const timestamp = new Date();

        if (isOnBreak) {
          const record: AttendanceRecord = {
            user_id: userId,
            user_name: userName,
            type: 'break-end',
            timestamp: timestamp.toISOString(),
          };

          await saveAttendance(record);
          const card = createBreakEndCard(userName, timestamp);
          sendToGoogleChat(card);
          return jsonResponse({ status: 'ok' });
        }

        if (lastRecord?.type === 'check-in' || lastRecord?.type === 'break-end') {
          sendToGoogleChat({ text: '⚠️ 이미 출근 상태입니다. 먼저 퇴근 처리를 해주세요.' });
          return jsonResponse({ status: 'ok' });
        }

        const record: AttendanceRecord = {
          user_id: userId,
          user_name: userName,
          type: 'check-in',
          timestamp: timestamp.toISOString(),
        };

        await saveAttendance(record);
        const card = createCheckInCard(userName, timestamp);
        sendToGoogleChat(card);
        return jsonResponse({ status: 'ok' });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        sendToGoogleChat({ text: `⚠️ 출근 처리 중 오류가 발생했습니다: ${message}` });
        return jsonResponse({ status: 'ok' });
      }
    }

    if (commandName === '/휴식') {
      try {
        const lastRecord = await getLastRecord(userId);

        if (!lastRecord) {
          sendToGoogleChat({ text: '⚠️ 출근 기록이 없습니다. 먼저 출근 처리를 해주세요.' });
          return jsonResponse({ status: 'ok' });
        }

        if (lastRecord.type === 'check-out') {
          sendToGoogleChat({ text: '⚠️ 이미 퇴근하셨습니다.' });
          return jsonResponse({ status: 'ok' });
        }

        if (lastRecord.type === 'break-start') {
          sendToGoogleChat({ text: '⚠️ 이미 휴식 중입니다.' });
          return jsonResponse({ status: 'ok' });
        }

        const timestamp = new Date();
        const record: AttendanceRecord = {
          user_id: userId,
          user_name: userName,
          type: 'break-start',
          timestamp: timestamp.toISOString(),
        };

        await saveAttendance(record);
        const card = createBreakStartCard(userName, timestamp);
        sendToGoogleChat(card);
        return jsonResponse({ status: 'ok' });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        sendToGoogleChat({ text: `⚠️ 휴식 처리 중 오류가 발생했습니다: ${message}` });
        return jsonResponse({ status: 'ok' });
      }
    }

    if (commandName === '/퇴근') {
      try {
        const lastRecord = await getLastRecord(userId);

        if (!lastRecord) {
          sendToGoogleChat({ text: '⚠️ 출근 기록이 없습니다. 먼저 출근 처리를 해주세요.' });
          return jsonResponse({ status: 'ok' });
        }

        if (lastRecord.type === 'check-out') {
          sendToGoogleChat({ text: '⚠️ 이미 퇴근 상태입니다. 다시 출근하려면 /출근을 입력하세요.' });
          return jsonResponse({ status: 'ok' });
        }

        if (lastRecord.type === 'break-start') {
          sendToGoogleChat({ text: '⚠️ 휴식 중입니다. /출근 명령어로 업무를 재개한 후 퇴근해주세요.' });
          return jsonResponse({ status: 'ok' });
        }

        const timestamp = new Date();
        const record: AttendanceRecord = {
          user_id: userId,
          user_name: userName,
          type: 'check-out',
          timestamp: timestamp.toISOString(),
        };

        await saveAttendance(record);

        const allTodayRecords = await getTodayAttendance(userId);
        const workingHours = calculateWorkingHours(allTodayRecords);

        const card = createCheckOutCard(userName, timestamp, workingHours);
        sendToGoogleChat(card);
        return jsonResponse({ status: 'ok' });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        sendToGoogleChat({ text: `⚠️ 퇴근 처리 중 오류가 발생했습니다: ${message}` });
        return jsonResponse({ status: 'ok' });
      }
    }

    return jsonResponse({ status: 'ok' });

  } catch (error: unknown) {
    console.error('Error processing:', error);
    sendToGoogleChat({ text: '⚠️ 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
    return jsonResponse({ status: 'ok' });
  }
});
