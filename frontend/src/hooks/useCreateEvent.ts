import { useEffect, useState } from 'react';
import { CreateEventDto, CreateTicketDto, CreateKioskDto } from '../types/event';
import { eventService } from '../services/eventService';
import { useNotification } from '../components/shared/NotificationProvider';

export const useCreateEvent = () => {
  const notify = useNotification();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    organizerName: '',
    organizerEmail: '',
    organizerHotline: '',
    organizerWebsite: '',
    organizerLegalId: '',
    organizerLogo: '', 
    organizerLogoFile: null as File | null, 
    title: '',
    description: '',
    eventSpeakers: '',
    location: '',
    eventImages: [] as string[], 
    eventImageFiles: [] as File[], 
    publicTime: '',
    openTicketTime: '',
    closeTicketTime: '',
    openKioskTime: '',
    startTime: '',
    endTime: '',
    emailSubject: '[SGU TechDay 2026] Thẻ vé tham dự chính thức của bạn',
    emailCheckinNote: 'Quý khách vui lòng bước tới làn quét khuôn mặt...',
    tickets: [{ name: '', price: 0, quantity: 100, description: '' }],
    kiosks: [{ name: 'Trạm 1 - Lối vào cổng', location: 'Lối vào cổng', secretToken: `` }],
  });

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      kiosks: prev.kiosks.map((k, idx) => ({
        ...k,
        secretToken: k.secretToken || `stk_live_${Math.random().toString(36).substring(2, 8)}`,
      })),
    }));
  }, []);

  const updateField = (field: keyof CreateEventDto, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      setFormData((prev) => ({
        ...prev,
        organizerLogo: previewUrl,
        organizerLogoFile: file,
      }));
      notify("Đã tải lên logo thành công", "success");
    }
  };

  const handleImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (formData.eventImages.length + files.length > 20) {
        notify("Chỉ được phép chọn tối đa 20 hình ảnh", "error");
        return;
      }
      const newPreviewUrls = files.map(file => URL.createObjectURL(file));
      setFormData((prev) => ({
        ...prev,
        eventImages: [...prev.eventImages, ...newPreviewUrls],
        eventImageFiles: [...prev.eventImageFiles, ...files],
      }));
      notify(`Đã thêm ${files.length} ảnh minh họa`, "success");
    }
  };

  const addTicket = () => {
    setFormData((prev) => ({
      ...prev,
      tickets: [...prev.tickets, { name: '', price: 0, quantity: 100, description: '' }],
    }));
  };

  const updateTicket = (index: number, field: keyof CreateTicketDto, value: any) => {
    const updatedTickets = [...formData.tickets];
    updatedTickets[index] = { ...updatedTickets[index], [field]: value };
    setFormData((prev) => ({ ...prev, tickets: updatedTickets }));
  };

  const removeTicket = (index: number) => {
    if (formData.tickets.length <= 1) {
      notify("Cần duy trì tối thiểu 1 phân hạng vé", "error");
      return;
    }
    const updatedTickets = formData.tickets.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, tickets: updatedTickets }));
  };

  const addKiosk = () => {
    setFormData((prev) => ({
      ...prev,
      kiosks: [...prev.kiosks, { 
        name: `Trạm ${prev.kiosks.length + 1} - Lối vào cổng`, 
        location: '', 
        secretToken: `stk_live_${Math.random().toString(36).substring(2, 8)}` 
      }],
    }));
  };

  const updateKiosk = (index: number, field: keyof CreateKioskDto, value: string) => {
    const updatedKiosks = [...formData.kiosks];
    updatedKiosks[index] = { ...updatedKiosks[index], [field]: value };
    setFormData((prev) => ({ ...prev, kiosks: updatedKiosks }));
  };

  const removeKiosk = (index: number) => {
    if (formData.kiosks.length <= 1) {
      notify("Cần có ít nhất 1 trạm kiểm soát", "error");
      return;
    }
    const updatedKiosks = formData.kiosks.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, kiosks: updatedKiosks }));
  };

  const validateTimeline = () => {
    const tPublic = new Date(formData.publicTime);
    const tOpenTicket = new Date(formData.openTicketTime);
    const tCloseTicket = new Date(formData.closeTicketTime);
    const tOpenKiosk = new Date(formData.openKioskTime);
    const tStart = new Date(formData.startTime);
    const tEnd = new Date(formData.endTime);

    if (tOpenTicket < tPublic) return 'Thời gian Mở bán vé không được trước ngày công khai sự kiện.';
    if (tCloseTicket <= tOpenTicket) return 'Ngày đóng bán vé phải diễn ra sau ngày mở bán vé.';
    if (tOpenKiosk < tCloseTicket) return 'Thời gian Mở Kiosk check-in phải sau khi đóng bán vé.';
    if (tStart < tOpenKiosk) return 'Bắt đầu sự kiện phải diễn ra sau khi mở Kiosk đón khách.';
    if (tEnd <= tStart) return 'Bế mạc sự kiện phải diễn ra sau khi bắt đầu.';
    return null;
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const validationError = validateTimeline();
    if (validationError) {
      notify(validationError, "error");
      setLoading(false);
      return;
    }

    try {
      await eventService.createEvent(formData);
      notify("Sự kiện được khởi tạo và xuất bản thành công!", "success");
      setTimeout(() => window.location.href = '/admin/events', 1000);
    } catch (err: any) {
      notify(err.response?.data?.Error || 'Lỗi hệ thống khi tạo sự kiện.', "error");
    } finally {
      setLoading(false);
    }
  };

  return {
    formData, loading, updateField, handleLogoUpload, handleImagesUpload,
    addTicket, updateTicket, removeTicket,
    addKiosk, updateKiosk, removeKiosk, submitForm,
  };
};