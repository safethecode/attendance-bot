import { GoogleChatMessage, WorkingHoursResult } from '../types';
import { config } from '../config/env';

class GoogleChatService {
  private dailyScrumWebhookUrl: string;
  private attendanceWebhookUrl: string;

  constructor() {
    this.dailyScrumWebhookUrl = config.googleChat.dailyScrumWebhookUrl;
    this.attendanceWebhookUrl = config.googleChat.attendanceWebhookUrl;
  }

  private async sendMessage(webhookUrl: string, message: GoogleChatMessage): Promise<void> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to send message to Google Chat: ${response.status} - ${errorText}`
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error sending message to Google Chat: ${error.message}`);
      }
      throw error;
    }
  }

  async sendDailyScrumReminder(): Promise<void> {
    const message: GoogleChatMessage = {
      cards: [
        {
          header: {
            title: '📋 데일리 스크럼 알림',
            subtitle: '오늘의 스크럼을 작성해주세요!',
          },
          sections: [
            {
              widgets: [
                {
                  textParagraph: {
                    text: '<b>안녕하세요!</b>\n\n오늘의 데일리 스크럼을 작성할 시간입니다.\n\n• 어제 한 일\n• 오늘 할 일\n• 이슈 사항',
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    await this.sendMessage(this.dailyScrumWebhookUrl, message);
  }

  async sendAttendanceMessage(message: GoogleChatMessage): Promise<void> {
    await this.sendMessage(this.attendanceWebhookUrl, message);
  }

  createCheckInMessage(userName: string, timestamp: Date): GoogleChatMessage {
    const time = timestamp.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      text: `🟢 <b>${userName}</b>님이 ${time}에 출근하셨습니다.`,
    };
  }

  createCheckOutMessage(
    userName: string,
    timestamp: Date,
    workingHours: WorkingHoursResult
  ): GoogleChatMessage {
    const time = timestamp.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      text: `🔴 <b>${userName}</b>님이 ${time}에 퇴근하셨습니다. (근무 시간: ${workingHours.workingHours}시간 ${workingHours.workingMinutes}분)`,
    };
  }

  createBreakStartMessage(userName: string, timestamp: Date): GoogleChatMessage {
    const time = timestamp.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      text: `⏸️ <b>${userName}</b>님이 ${time}에 휴식을 시작했습니다.`,
    };
  }

  createBreakEndMessage(userName: string, timestamp: Date): GoogleChatMessage {
    const time = timestamp.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      text: `▶️ <b>${userName}</b>님이 ${time}에 업무를 재개했습니다.`,
    };
  }
}

export const googleChatService = new GoogleChatService();
