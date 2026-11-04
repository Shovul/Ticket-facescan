
export interface EventSummary {
  id: number;
  title: string;
  status: string;
  statusText: string;
  startTime: string;
  location: string;
  coverImage: string;
  total: number;
  sold: number;
}

export interface EventDetail {
  id: number;
  title: string;
  description: string;
  location: string;
  startTime: string;
  endTime: string;
  status: string;
  totalCapacity?: number;
  organizerName?: string;
  organizerEmail?: string;
}

export interface PaginatedEventResponse {
  items: EventSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface Attendee {
  id: number;
  ticketCode: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  attendeeFaceData?: string;
  hasFaceScan: boolean;
  status: 'Valid' | 'CheckedIn' | 'Cancelled';
  checkedInAt?: string;
  ticketClass: string;
}

export interface GetAttendeesResponse {
  items: Attendee[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
}