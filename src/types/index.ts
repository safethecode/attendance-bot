export interface AttendanceRecord {
  id?: number;
  user_id: string;
  user_name: string;
  type: 'check-in' | 'check-out' | 'break-start' | 'break-end';
  timestamp: string;
  created_at?: string;
}

export interface WorkingHoursResult {
  totalHours: number;
  totalMinutes: number;
  workingHours: number;
  workingMinutes: number;
  breakHours: number;
  breakMinutes: number;
}

export interface GoogleChatMessage {
  text?: string;
  cards?: GoogleChatCard[];
}

export interface GoogleChatCard {
  header?: {
    title: string;
    subtitle?: string;
    imageUrl?: string;
  };
  sections: GoogleChatSection[];
}

export interface GoogleChatSection {
  widgets: GoogleChatWidget[];
}

export interface GoogleChatWidget {
  textParagraph?: {
    text: string;
  };
  buttons?: Array<{
    textButton: {
      text: string;
      onClick: {
        openLink: {
          url: string;
        };
      };
    };
  }>;
}

export interface GoogleChatEvent {
  type: string;
  message?: {
    text?: string;
    slashCommand?: {
      commandId?: string;
      commandName?: string;
    };
    sender: {
      name: string;
      displayName: string;
    };
  };
  space: {
    name: string;
  };
}
