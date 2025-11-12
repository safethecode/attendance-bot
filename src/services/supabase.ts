import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/env';
import { AttendanceRecord, WorkingHoursResult } from '../types';

class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(config.supabase.url, config.supabase.key);
  }

  async saveAttendance(record: AttendanceRecord): Promise<AttendanceRecord> {
    const { data, error } = await this.client
      .from('attendance')
      .insert({
        user_id: record.user_id,
        user_name: record.user_name,
        type: record.type,
        timestamp: record.timestamp,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save attendance: ${error.message}`);
    }

    return data as AttendanceRecord;
  }

  async getTodayAttendance(userId: string): Promise<AttendanceRecord[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await this.client
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', today.toISOString())
      .lt('timestamp', tomorrow.toISOString())
      .order('timestamp', { ascending: true });

    if (error) {
      throw new Error(`Failed to get attendance: ${error.message}`);
    }

    return (data as AttendanceRecord[]) || [];
  }

  async getLastCheckIn(userId: string): Promise<AttendanceRecord | null> {
    const { data, error } = await this.client
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'check-in')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get last check-in: ${error.message}`);
    }

    return data as AttendanceRecord | null;
  }

  async getLastRecord(userId: string): Promise<AttendanceRecord | null> {
    const { data, error } = await this.client
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get last record: ${error.message}`);
    }

    return data as AttendanceRecord | null;
  }

  calculateWorkingHours(records: AttendanceRecord[]): WorkingHoursResult {
    let totalWorkingMs = 0;
    let totalBreakMs = 0;
    let currentCheckIn: Date | null = null;
    let currentBreakStart: Date | null = null;

    for (const record of records) {
      const timestamp = new Date(record.timestamp);

      switch (record.type) {
        case 'check-in':
          currentCheckIn = timestamp;
          break;

        case 'break-start':
          if (currentCheckIn) {
            // 출근부터 휴식 시작까지의 근무 시간 계산
            totalWorkingMs += timestamp.getTime() - currentCheckIn.getTime();
            currentCheckIn = null;
          }
          currentBreakStart = timestamp;
          break;

        case 'break-end':
          if (currentBreakStart) {
            // 휴식 시간 계산
            totalBreakMs += timestamp.getTime() - currentBreakStart.getTime();
            currentBreakStart = null;
          }
          // 휴식 종료 = 다시 출근으로 간주
          currentCheckIn = timestamp;
          break;

        case 'check-out':
          if (currentCheckIn) {
            // 출근(또는 휴식 종료)부터 퇴근까지의 근무 시간 계산
            totalWorkingMs += timestamp.getTime() - currentCheckIn.getTime();
            currentCheckIn = null;
          }
          break;
      }
    }

    const totalMs = totalWorkingMs + totalBreakMs;
    const totalHours = Math.floor(totalMs / (1000 * 60 * 60));
    const totalMinutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));

    const workingHours = Math.floor(totalWorkingMs / (1000 * 60 * 60));
    const workingMinutes = Math.floor((totalWorkingMs % (1000 * 60 * 60)) / (1000 * 60));

    const breakHours = Math.floor(totalBreakMs / (1000 * 60 * 60));
    const breakMinutes = Math.floor((totalBreakMs % (1000 * 60 * 60)) / (1000 * 60));

    return {
      totalHours,
      totalMinutes,
      workingHours,
      workingMinutes,
      breakHours,
      breakMinutes,
    };
  }
}

export const supabaseService = new SupabaseService();
