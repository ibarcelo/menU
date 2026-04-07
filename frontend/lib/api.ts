/**
 * Typed API client for the FastAPI backend.
 * All functions throw on error (caught by callers / toast handlers).
 */

import type {
  Session,
  MenuData,
  MenuItem,
  Participant,
  OrdersSummary,
} from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Sessions ──────────────────────────────────

export const createSession = (restaurant?: string) =>
  req<Session>("/api/sessions", {
    method: "POST",
    body: JSON.stringify({ restaurant: restaurant ?? null }),
  });

export const getSession = (id: string) => req<Session>(`/api/sessions/${id}`);

// ── Scan ──────────────────────────────────────

export async function uploadMenuImages(sessionId: string, files: File[]) {
  const form = new FormData();
  for (const f of files) form.append("images", f);

  const res = await fetch(`${BASE}/api/sessions/${sessionId}/scan`, {
    method: "POST",
    body: form,
    // No Content-Type header — browser sets multipart boundary automatically
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<{ scan_job_id: string; message: string }>;
}

// ── Menu ──────────────────────────────────────

export const getMenu = (sessionId: string) =>
  req<MenuData>(`/api/sessions/${sessionId}/menu`);

export const addMenuItem = (sessionId: string, item: Partial<MenuItem>) =>
  req<MenuItem>(`/api/sessions/${sessionId}/menu`, {
    method: "POST",
    body: JSON.stringify(item),
  });

export const updateMenuItem = (
  sessionId: string,
  itemId: string,
  updates: Partial<MenuItem>
) =>
  req<MenuItem>(`/api/sessions/${sessionId}/menu/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });

export const deleteMenuItem = (sessionId: string, itemId: string) =>
  req<void>(`/api/sessions/${sessionId}/menu/${itemId}`, { method: "DELETE" });

// ── Participants ──────────────────────────────

export const joinSession = (sessionId: string, name: string) =>
  req<Participant>(`/api/sessions/${sessionId}/participants`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });

export const heartbeat = (sessionId: string, participantId: string) =>
  req<{ last_seen_at: string }>(
    `/api/sessions/${sessionId}/participants/${participantId}/heartbeat`,
    { method: "PATCH" }
  );

export const listParticipants = (sessionId: string) =>
  req<Participant[]>(`/api/sessions/${sessionId}/participants`);

// ── Orders ────────────────────────────────────

export const upsertOrder = (
  sessionId: string,
  participantId: string,
  menuItemId: string,
  quantity: number,
  notes = ""
) =>
  req(`/api/sessions/${sessionId}/orders`, {
    method: "PUT",
    body: JSON.stringify({
      participant_id: participantId,
      menu_item_id: menuItemId,
      quantity,
      notes,
    }),
  });

export const getOrders = (sessionId: string) =>
  req<OrdersSummary>(`/api/sessions/${sessionId}/orders`);
