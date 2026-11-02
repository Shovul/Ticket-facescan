import axios from 'axios';
import { CreateEventDto, PaginatedEventResponse, EventDetailResponse } from '../types/event';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken'); 
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const eventService = {
  createEvent: async (data: any) => {
    const formData = new FormData();

    Object.keys(data).forEach((key) => {
      if (key !== 'tickets' && key !== 'kiosks' && key !== 'eventImageFiles' && key !== 'organizerLogoFile' && key !== 'eventImages' && key !== 'organizerLogo') {
        if (data[key] !== undefined && data[key] !== null) {
          formData.append(key, data[key]);
        }
      }
    });

    if (data.organizerLogoFile) {
      formData.append('OrganizerLogoFile', data.organizerLogoFile);
    }

    if (data.eventImageFiles && Array.isArray(data.eventImageFiles)) {
      data.eventImageFiles.forEach((file: File) => {
        formData.append('EventImageFiles', file);
      });
    }

    if (data.tickets && Array.isArray(data.tickets)) {
      data.tickets.forEach((ticket: any, index: number) => {
        formData.append(`Tickets[${index}].Name`, ticket.name);
        formData.append(`Tickets[${index}].Price`, ticket.price);
        formData.append(`Tickets[${index}].Quantity`, ticket.quantity);
        if (ticket.description) {
          formData.append(`Tickets[${index}].Description`, ticket.description);
        }
      });
    }

    if (data.kiosks && Array.isArray(data.kiosks)) {
      data.kiosks.forEach((kiosk: any, index: number) => {
        formData.append(`Kiosks[${index}].Name`, kiosk.name);
        formData.append(`Kiosks[${index}].Location`, kiosk.location || '');
        if (kiosk.secretToken) {
          formData.append(`Kiosks[${index}].SecretToken`, kiosk.secretToken);
        }
      });
    }

    const response = await apiClient.post('/events', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getEvents: async (page: number, pageSize: number = 10, search: string = '', status: string = 'all'): Promise<PaginatedEventResponse> => {
    const response = await apiClient.get('/events', {
      params: { page, pageSize, search, status }
    });
    return response.data;
  },

  getEventById: async (id: number): Promise<EventDetailResponse> => {
    const response = await apiClient.get(`/events/${id}`);
    return response.data;
  }
};