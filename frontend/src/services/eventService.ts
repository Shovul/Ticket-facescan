import axios from 'axios';
import { CreateEventDto, PaginatedEventResponse, EventDetailResponse } from '../types/event';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5162/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const eventService = {
  createEvent: async (data: CreateEventDto) => {
    const response = await apiClient.post('/events', data);
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