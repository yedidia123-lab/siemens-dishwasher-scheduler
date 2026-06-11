export interface ScheduleItem {
  id: string;
  name: string;
  dayOfWeek: number; // -1 for one-time, 0 for Sunday, 1 for Monday, etc.
  oneTimeDate?: string; // "YYYY-MM-DD" if dayOfWeek is -1
  time: string; // "HH:MM"
  program: string;
  status: 'pending' | 'triggering' | 'triggered' | 'failed' | 'cancelled' | 'missed';
  lastRun?: string;
  lastRunStatus?: 'success' | 'failed';
  errorLog?: string;
  technicalError?: string;
  applianceId: string;
}

export interface Appliance {
  haId: string;
  name: string;
  brand: string;
  type: string;
  connected: boolean;
  doorState: 'Closed' | 'Open' | 'Unknown';
  remoteStartAllowed: boolean;
  operationState: string; // 'Ready', 'Run', 'Finished', etc.
  activeProgram?: string;
}

export interface AuthConfig {
  clientId: string;
  clientSecret: string;
  useSimulator: boolean;
  liveApiUrl: string; // "https://api.home-connect.com" or "https://simulator.home-connect.com"
  hasToken: boolean;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  scheduleId?: string;
}
