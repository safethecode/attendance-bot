import { Router, Request, Response } from 'express';
import { supabaseService } from '../services/supabase';
import { googleChatService } from '../services/google-chat';
import { GoogleChatEvent, AttendanceRecord } from '../types';

const router = Router();

router.post('/bot', async (req: Request, res: Response) => {
  try {
    const event: GoogleChatEvent = req.body;

    if (event.type === 'ADDED_TO_SPACE') {
      return res.status(200).json({
        text: '안녕하세요! 출퇴근 관리 봇입니다. 👋\n\n사용 가능한 명령어:\n• `/출근` - 출근 처리\n• `/퇴근` - 퇴근 처리 및 근무 시간 계산\n• `/휴식` - 휴식 시작 (다시 `/출근`으로 업무 재개)',
      });
    }

    if (event.type === 'MESSAGE' && event.message) {
      const message = (event.message.slashCommand?.commandName || event.message.text || '').trim();
      const userId = event.message.sender.name;
      const userName = event.message.sender.displayName;

      if (message === '/출근') {
        const lastRecord = await supabaseService.getLastRecord(userId);
        const todayAttendance = await supabaseService.getTodayAttendance(userId);

        const hasCheckedInToday = todayAttendance.some(
          (record) => record.type === 'check-in'
        );

        const isOnBreak = lastRecord?.type === 'break-start';

        if (isOnBreak) {
          const timestamp = new Date();
          const record: AttendanceRecord = {
            user_id: userId,
            user_name: userName,
            type: 'break-end',
            timestamp: timestamp.toISOString(),
          };

          await supabaseService.saveAttendance(record);

          const responseMessage = googleChatService.createBreakEndMessage(
            userName,
            timestamp
          );

          await googleChatService.sendAttendanceMessage(responseMessage);
          return res.status(200).json(responseMessage);
        }

        if (hasCheckedInToday) {
          return res.status(200).json({
            text: '⚠️ 이미 오늘 출근 처리가 되어 있습니다.',
          });
        }

        const timestamp = new Date();
        const record: AttendanceRecord = {
          user_id: userId,
          user_name: userName,
          type: 'check-in',
          timestamp: timestamp.toISOString(),
        };

        await supabaseService.saveAttendance(record);

        const responseMessage = googleChatService.createCheckInMessage(
          userName,
          timestamp
        );

        await googleChatService.sendAttendanceMessage(responseMessage);
        return res.status(200).json(responseMessage);
      } else if (message === '/휴식') {
        const lastRecord = await supabaseService.getLastRecord(userId);

        if (!lastRecord) {
          return res.status(200).json({
            text: '⚠️ 출근 기록이 없습니다. 먼저 출근 처리를 해주세요.',
          });
        }

        if (lastRecord.type === 'check-out') {
          return res.status(200).json({
            text: '⚠️ 이미 퇴근하셨습니다.',
          });
        }

        if (lastRecord.type === 'break-start') {
          return res.status(200).json({
            text: '⚠️ 이미 휴식 중입니다.',
          });
        }

        const timestamp = new Date();

        const record: AttendanceRecord = {
          user_id: userId,
          user_name: userName,
          type: 'break-start',
          timestamp: timestamp.toISOString(),
        };

        await supabaseService.saveAttendance(record);

        const responseMessage = googleChatService.createBreakStartMessage(
          userName,
          timestamp
        );

        await googleChatService.sendAttendanceMessage(responseMessage);
        return res.status(200).json(responseMessage);
      } else if (message === '/퇴근') {
        const lastCheckIn = await supabaseService.getLastCheckIn(userId);

        if (!lastCheckIn) {
          return res.status(200).json({
            text: '⚠️ 출근 기록이 없습니다. 먼저 출근 처리를 해주세요.',
          });
        }

        const todayAttendance = await supabaseService.getTodayAttendance(userId);
        const hasCheckedOutToday = todayAttendance.some(
          (record) => record.type === 'check-out'
        );

        if (hasCheckedOutToday) {
          return res.status(200).json({
            text: '⚠️ 이미 오늘 퇴근 처리가 되어 있습니다.',
          });
        }

        const lastRecord = await supabaseService.getLastRecord(userId);
        if (lastRecord?.type === 'break-start') {
          return res.status(200).json({
            text: '⚠️ 휴식 중입니다. /출근 명령어로 업무를 재개한 후 퇴근해주세요.',
          });
        }

        const timestamp = new Date();

        const record: AttendanceRecord = {
          user_id: userId,
          user_name: userName,
          type: 'check-out',
          timestamp: timestamp.toISOString(),
        };

        await supabaseService.saveAttendance(record);

        const allTodayRecords = await supabaseService.getTodayAttendance(userId);
        const workingHours = supabaseService.calculateWorkingHours(allTodayRecords);

        const responseMessage = googleChatService.createCheckOutMessage(
          userName,
          timestamp,
          workingHours
        );

        await googleChatService.sendAttendanceMessage(responseMessage);
        return res.status(200).json(responseMessage);
      }
    }

    return res.status(200).json({});
  } catch (error) {
    return res.status(200).json({
      text: '❌ 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    });
  }
});

export default router;
