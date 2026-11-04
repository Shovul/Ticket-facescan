import axios from 'axios';
import { 
  EventDetail, 
  PaginatedEventResponse, 
  GetAttendeesResponse 
} from '../types/dashboard';

const getBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!envUrl) return 'http://localhost:5000/api';
  
  const cleaned = envUrl.replace(/\/$/, '').replace(/\/v1$/, '');
  return cleaned.endsWith('/api') ? cleaned : `${cleaned}/api`;
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const DashboardService = {
  getEvents: async (page = 1, pageSize = 20, search = '', status = 'all'): Promise<PaginatedEventResponse> => {
    const res = await api.get('/v1/events', {
      params: { page, pageSize, search, status }
    });
    return res.data;
  },

  getEventById: async (id: number): Promise<EventDetail> => {
    const res = await api.get(`/v1/events/${id}`);
    return res.data;
  },

  getAttendees: async (
    eventId: number, 
    pageNumber = 1, 
    keyword = '', 
    ticketClass = '', 
    status = ''
  ): Promise<GetAttendeesResponse> => {
    const res = await api.get(`/admin/attendees/${eventId}`, {
      params: { pageNumber, keyword, ticketClass, status }
    });
    return res.data;
  },

  exportAttendeesCSV: async (eventId: number) => {
    const res = await api.get(`/admin/attendees/export/${eventId}`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Danh_sach_tham_du_Event_${eventId}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};