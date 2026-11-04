import { useState, useEffect, useRef, useCallback } from 'react';
import { DashboardService } from '../services/dashboardService';
import { EventSummary, EventDetail, Attendee } from '../types/dashboard';
import { HubConnectionBuilder, LogLevel, HubConnection, HubConnectionState } from '@microsoft/signalr';

export const useDashboard = () => {
  const [eventsList, setEventsList] = useState<EventSummary[]>([]);
  const [activeEventId, setActiveEventId] = useState<number | null>(null); 
  const [eventData, setEventData] = useState<EventDetail | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [totalAttendees, setTotalAttendees] = useState(0);
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [faceScannedCount, setFaceScannedCount] = useState(0);
  
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historySearchKw, setHistorySearchKw] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const kioskHubRef = useRef<HubConnection | null>(null);
  const transactionHubRef = useRef<HubConnection | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await DashboardService.getEvents(1, 50);
        if (response.items && response.items.length > 0) {
          setEventsList(response.items);
          setActiveEventId(response.items[0].id);
        }
      } catch (error) {
        console.error('Lỗi khi tải danh sách sự kiện:', error);
      }
    };
    fetchEvents();
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (!activeEventId) return;
    setIsLoading(true);
    try {
      const [eventDetails, attendeesRes] = await Promise.all([
        DashboardService.getEventById(activeEventId),
        DashboardService.getAttendees(activeEventId, 1)
      ]);

      setEventData(eventDetails);

      const safeItems = Array.isArray(attendeesRes?.items) ? attendeesRes.items : [];
      setAttendees(safeItems);
      setTotalAttendees(attendeesRes?.totalCount || 0);

      // Compute statistics
      const checkedIn = safeItems.filter(a => a.status === 'CheckedIn' || a.checkedInAt != null).length;
      const faceScanned = safeItems.filter(a => a.hasFaceScan || !!a.attendeeFaceData).length;

      setCheckedInCount(checkedIn);
      setFaceScannedCount(faceScanned);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeEventId]);

  useEffect(() => {
    if (!activeEventId) return;
    fetchDashboardData();

    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

    const kioskConn = new HubConnectionBuilder()
      .withUrl(`${baseUrl}/hubs/kiosk`)
      .configureLogging(LogLevel.Information)
      .withAutomaticReconnect()
      .build();

    kioskConn.on('ReceiveCheckinUpdate', (newLog: Attendee) => {
      setAttendees(prev => {
        const existingIdx = prev.findIndex(a => a.ticketCode === newLog.ticketCode);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = { 
            ...updated[existingIdx], 
            status: 'CheckedIn', 
            checkedInAt: newLog.checkedInAt,
            hasFaceScan: newLog.hasFaceScan ?? true,
            attendeeFaceData: newLog.attendeeFaceData ?? updated[existingIdx].attendeeFaceData
          };
          return updated;
        }
        return [newLog, ...prev];
      });

      setCheckedInCount(prev => prev + 1);
      if (newLog.hasFaceScan) {
        setFaceScannedCount(prev => prev + 1);
      }
    });

    async function startKioskHub() {
      try {
        await kioskConn.start();
        if (kioskConn.state === HubConnectionState.Connected) {
          await kioskConn.invoke("JoinEventRoom", activeEventId);
        }
      } catch (err) {
        console.error("KioskHub connection error:", err);
      }
    }

    startKioskHub();
    kioskHubRef.current = kioskConn;

    const transactionConn = new HubConnectionBuilder()
      .withUrl(`${baseUrl}/hubs/transactions`)
      .withAutomaticReconnect()
      .build();

    transactionConn.on("ReceiveNewTransaction", (newTransaction: any) => {
      if (newTransaction.eventId === activeEventId) {
        fetchDashboardData(); 
      }
    });

    async function startTransactionHub() {
      try {
        await transactionConn.start();
      } catch (err) {
        console.error("TransactionHub connection error:", err);
      }
    }

    startTransactionHub();
    transactionHubRef.current = transactionConn;

    return () => {
      if (kioskHubRef.current) {
        const conn = kioskHubRef.current;
        if (conn.state === HubConnectionState.Connected) {
          conn.invoke("LeaveEventRoom", activeEventId)
            .catch(console.error)
            .finally(() => conn.stop());
        } else {
          conn.stop();
        }
      }
      if (transactionHubRef.current) {
        transactionHubRef.current.stop();
      }
    };
  }, [activeEventId, fetchDashboardData]);

  const handleEventChange = (e: React.ChangeEvent<HTMLSelectElement>) => setActiveEventId(Number(e.target.value));
  const openHistoryModal = () => setIsHistoryModalOpen(true);
  const closeHistoryModal = () => setIsHistoryModalOpen(false);
  
  const handleExportCSV = async () => {
    if (activeEventId) await DashboardService.exportAttendeesCSV(activeEventId);
  };

  const filteredHistory = attendees.filter(item => 
    item.attendeeName?.toLowerCase().includes(historySearchKw.toLowerCase()) || 
    item.ticketCode?.toLowerCase().includes(historySearchKw.toLowerCase())
  );

  const faceScannedAttendees = attendees.filter(a => a.hasFaceScan || !!a.attendeeFaceData);

  return {
    eventsList,
    activeEventId,
    handleEventChange,
    eventData,
    attendees: filteredHistory,
    faceScannedAttendees,
    totalAttendees,
    checkedInCount,
    faceScannedCount,
    isLoading,
    isHistoryModalOpen,
    openHistoryModal,
    closeHistoryModal,
    historySearchKw,
    setHistorySearchKw,
    handleExportCSV
  };
};