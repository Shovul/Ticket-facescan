export interface KioskEventInfo {
  id: number;
  title: string;
  description?: string;
  location: string;
  startTime: string;
  endTime: string;
  coverImage?: string;
  isFaceRecognitionEnabled: boolean;
  isQrEnabled: boolean;
  totalTickets: number;
  checkedInCount: number;
}

export interface CheckinResult {
  success: boolean;
  statusCode: string;
  message: string;
  borderColor: string;
  ticketCode?: string;
  attendeeName?: string;
  attendeeEmail?: string;
  ticketTypeName?: string;
  matchDistance?: number;
  similarityPercent?: number;
  checkedInAt?: string;
  totalLatencyMs?: number;
}

export interface OfflineTicket {
  id: number;
  ticketCode: string;
  attendeeName: string;
  attendeeEmail: string;
  ticketTypeName: string;
  status: number; // 0: Valid, 1: CheckedIn, 2: Cancelled
  qrCodeUrl?: string;
  checkedInAt?: string | null;
}

export interface OfflineLogItem {
  id?: number;
  ticketCode: string;
  capturedAt: string;
  checkinMethod: string;
  notes?: string;
}
