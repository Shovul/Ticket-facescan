export interface CreateTicketDto {
  name: string;
  price: number;
  quantity: number;
}

export interface CreateKioskDto {
  name: string;
  location: string;
}

export interface CreateEventDto {
  organizerId?: number; 
  organizerName: string;
  organizerEmail: string;
  organizerHotline: string;
  title: string;
  description: string;
  location: string;
  eventImages: string[];
  publicTime: string;
  openTicketTime: string;
  closeTicketTime: string;
  openKioskTime: string;
  startTime: string;
  endTime: string;
  tickets: CreateTicketDto[];
  kiosks: CreateKioskDto[];
}

export interface EventSummaryDto {
  id: number;
  title: string;
  status: 'open' | 'upcoming' | 'ended' | 'cancelled';
  statusText: string;
  startTime: string;
  location: string;
  coverImage: string;
  sold: number;
  total: number;
}

export interface PaginatedEventResponse {
  items: EventSummaryDto[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface EventDetailResponse extends CreateEventDto {
  id: number;
  status: number;
  createdAt: string;
  tickets: (CreateTicketDto & { id: number; quantitySold: number })[];
  kiosks: (CreateKioskDto & { id: number; secretToken: string; isActive: boolean })[];
}