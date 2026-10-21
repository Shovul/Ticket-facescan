import { OfflineTicket, OfflineLogItem } from "../types/kiosk";

const DB_NAME = "eventpass_kiosk_db";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not available in this environment."));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("tickets")) {
        db.createObjectStore("tickets", { keyPath: "ticketCode" });
      }
      if (!db.objectStoreNames.contains("offline_logs")) {
        db.createObjectStore("offline_logs", { keyPath: "id", autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineTickets(tickets: OfflineTicket[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("tickets", "readwrite");
    const store = tx.objectStore("tickets");
    tickets.forEach((ticket) => store.put(ticket));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getOfflineTicket(ticketCode: string): Promise<OfflineTicket | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("tickets", "readonly");
    const store = tx.objectStore("tickets");
    const request = store.get(ticketCode);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function markTicketCheckedInLocally(ticketCode: string, checkedInAt: string): Promise<void> {
  const db = await openDb();
  const ticket = await getOfflineTicket(ticketCode);
  if (ticket) {
    ticket.status = 1; // CheckedIn
    ticket.checkedInAt = checkedInAt;
    return new Promise((resolve, reject) => {
      const tx = db.transaction("tickets", "readwrite");
      const store = tx.objectStore("tickets");
      store.put(ticket);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export async function addOfflineLog(log: OfflineLogItem): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("offline_logs", "readwrite");
    const store = tx.objectStore("offline_logs");
    store.add(log);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingOfflineLogs(): Promise<OfflineLogItem[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("offline_logs", "readonly");
    const store = tx.objectStore("offline_logs");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function clearPendingOfflineLogs(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("offline_logs", "readwrite");
    const store = tx.objectStore("offline_logs");
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function purgeKioskCache(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["tickets", "offline_logs"], "readwrite");
    tx.objectStore("tickets").clear();
    tx.objectStore("offline_logs").clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
