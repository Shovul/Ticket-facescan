export interface TicketDto {
  id?: number;
  name: string;
  price: number;
  quantity: number;
}

export interface KioskDto {
  id?: number;
  name: string;
  location: string;
  secretToken?: string;
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
  tickets: TicketDto[];
  kiosks: KioskDto[];
}

export interface EventResponse extends CreateEventDto {
  id: number;
  status: number;
  createdAt: string;
}