export interface PublicTicket { id: number; name: string; price: number; remainingQuantity: number; }
export interface CustomerSummary { id: number; fullName: string; avatarUrl?: string; ticketCount: number; }
export interface PublicEvent {
  id: number; title: string; description?: string; coverImage?: string; location: string;
  startTime: string; endTime: string; remainingQuantity: number; tickets: PublicTicket[];
  organizerName?: string; organizerAvatarUrl?: string;
}
export interface PublicEventPage { items: PublicEvent[]; page: number; pageSize: number; totalCount: number; totalPages: number; }
export interface BookingItem {
  id: number; ticketTypeId: number; ticketTypeName: string; unitPrice: number; status: string;
  attendeeName?: string; attendeeEmail?: string; attendeePhone?: string; hasFaceId: boolean;
  ticketCode?: string; qrCodeUrl?: string;
}
export interface BookingPayment { bankCode: string; accountNumber: string; accountName: string; memo: string; amount: number; qrUrl: string; }
export interface Booking {
  id: number; orderCode: string; eventId: number; eventTitle: string; location: string; startTime: string;
  status: string; totalAmount: number; serverTime: string; expiresAt?: string; paymentExpiresAt?: string;
  paidAt?: string; items: BookingItem[]; payment?: BookingPayment; emailSent: boolean;
}
