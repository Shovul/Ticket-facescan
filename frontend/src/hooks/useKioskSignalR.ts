import { useEffect, useRef, useCallback } from "react";
import * as signalR from "@microsoft/signalr";
import { CheckinResult } from "../types/kiosk";

interface UseKioskSignalRProps {
  apiBaseUrl: string;
  onCheckinUpdate: (data: CheckinResult) => void;
  onPurgeCache: () => void;
}

export function useKioskSignalR({ apiBaseUrl, onCheckinUpdate, onPurgeCache }: UseKioskSignalRProps) {
  const hubConnectionRef = useRef<signalR.HubConnection | null>(null);

  const connect = useCallback(async () => {
    try {
      if (hubConnectionRef.current) return;

      const connection = new signalR.HubConnectionBuilder()
        .withUrl(`${apiBaseUrl}/hubs/kiosk`)
        .withAutomaticReconnect()
        .build();

      connection.on("ReceiveCheckinUpdate", (data: CheckinResult) => {
        onCheckinUpdate(data);
      });

      connection.on("ReceivePurgeCache", () => {
        onPurgeCache();
      });

      await connection.start();
      hubConnectionRef.current = connection;
      console.log("✅ [SIGNALR] Kết nối Hub Kiosk thành công.");
    } catch (err) {
      console.warn("Không thể kết nối SignalR Hub:", err);
    }
  }, [apiBaseUrl, onCheckinUpdate, onPurgeCache]);

  const disconnect = useCallback(async () => {
    if (hubConnectionRef.current) {
      await hubConnectionRef.current.stop();
      hubConnectionRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { connect, disconnect };
}
