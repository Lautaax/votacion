export type UserRole = 'admin' | 'concejal';
export type VoteOption = 'si' | 'no' | 'abstencion' | 'pending';
export type ExpedienteStatus = 'pendiente' | 'aprobado' | 'rechazado';

export interface UserProfile {
  uid: string;
  name: string;
  role: UserRole;
  party: string;
  isCheckedIn: boolean;
  isBloquePresident: boolean;
}

export interface Expediente {
  id: string;
  title: string;
  description: string;
  author: string;
  submissionDate: string;
  status: ExpedienteStatus;
  createdAt: any;
}

export interface Vote {
  id: string;
  expedienteId: string;
  userId: string;
  userName: string;
  vote: VoteOption;
  timestamp: any;
}

export interface SessionConfig {
  activeExpedienteId: string | null;
  timerEnd: any | null;
  isSessionActive: boolean;
  nextSessionDate: string;
  quorumRequired: number;
}
