import { useState } from 'react';
import { CreateEventDto, CreateTicketDto, CreateKioskDto } from '../types/event';
import { eventService } from '../services/eventService';

export const useCreateEvent = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateEventDto>({
    organizerName: '',
    organizerEmail: '',
    organizerHotline: '',
    title: '',
    description: '',
    location: '',
    eventImages: [],
    publicTime: '',
    openTicketTime: '',
    closeTicketTime: '',
    openKioskTime: '',
    startTime: '',
    endTime: '',
    tickets: [{ name: '', price: 0, quantity: 100 }],
    kiosks: [{ name: '', location: '' }], 
  });

  const updateField = (field: keyof CreateEventDto, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addTicket = () => {
    setFormData((prev) => ({
      ...prev,
      tickets: [...prev.tickets, { name: '', price: 0, quantity: 100 }],
    }));
  };

  const updateTicket = (index: number, field: keyof CreateTicketDto, value: any) => {
    const updatedTickets = [...formData.tickets];
    updatedTickets[index] = { ...updatedTickets[index], [field]: value };
    setFormData((prev) => ({ ...prev, tickets: updatedTickets }));
  };

  const removeTicket = (index: number) => {
    if (formData.tickets.length <= 1) return; 
    const updatedTickets = formData.tickets.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, tickets: updatedTickets }));
  };

  // Quản lý Kiosk
  const addKiosk = () => {
    setFormData((prev) => ({
      ...prev,
      kiosks: [...prev.kiosks, { name: '', location: '' }],
    }));
  };

  const updateKiosk = (index: number, field: keyof CreateKioskDto, value: string) => {
    const updatedKiosks = [...formData.kiosks];
    updatedKiosks[index] = { ...updatedKiosks[index], [field]: value };
    setFormData((prev) => ({ ...prev, kiosks: updatedKiosks }));
  };

  const removeKiosk = (index: number) => {
    if (formData.kiosks.length <= 1) return; 
    const updatedKiosks = formData.kiosks.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, kiosks: updatedKiosks }));
  };

  const validateTimeline = () => {
    const { publicTime, openTicketTime, closeTicketTime, openKioskTime, startTime, endTime } = formData;
    const tPublic = new Date(publicTime);
    const tOpenTicket = new Date(openTicketTime);
    const tCloseTicket = new Date(closeTicketTime);
    const tOpenKiosk = new Date(openKioskTime);
    const tStart = new Date(startTime);
    const tEnd = new Date(endTime);

    if (tOpenTicket < tPublic) return 'E1: Thời gian Mở bán vé không được trước thời gian Công khai Web.';
    if (tCloseTicket < tOpenTicket) return 'E1: Thời gian Đóng bán vé không được trước thời gian Mở bán vé.';
    if (tOpenKiosk < tCloseTicket) return 'E1: Thời gian Mở Kiosk check-in không được trước thời gian Đóng bán vé.';
    if (tStart < tOpenKiosk) return 'E1: Thời gian Bắt đầu sự kiện không được trước thời gian Mở Kiosk.';
    if (tEnd <= tStart) return 'E1: Thời gian Kết thúc phải diễn ra sau Thời gian Bắt đầu sự kiện.';
    
    return null;
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const validationError = validateTimeline();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      await eventService.createEvent(formData);
      alert('Sự kiện được khởi tạo và xuất bản thành công.');
    } catch (err: any) {
      setError(err.response?.data?.Error || 'Lỗi hệ thống khi tạo sự kiện.');
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    loading,
    error,
    updateField,
    addTicket,
    updateTicket,
    removeTicket,
    addKiosk,
    updateKiosk,
    removeKiosk,
    submitForm,
  };
};