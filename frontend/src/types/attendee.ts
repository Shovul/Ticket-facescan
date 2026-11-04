export interface Attendee {
  id: number;
  ticketCode: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string;
  attendeeFaceData: string | null;
  hasFaceScan: boolean;
  status: "Valid" | "CheckedIn" | "Cancelled";
  checkedInAt: string | null;
  checkInGate?: string | null;
  ticketClass: string;
}

export interface PhotoModalData {
  name: string;
  code: string;
  url: string;
}
