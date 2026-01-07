import type { RequestStatus } from './request';

export type RequestEventType = string;

export interface RequestEventDto {
  id: string;
  requestId: string;
  actorId: string | null;
  eventType: RequestEventType;
  fromStatus: RequestStatus | null;
  toStatus: RequestStatus | null;
  message: string | null;
  visibleToClient: boolean;
  revisionNumber: number | null;
  createdAt: string;
}
