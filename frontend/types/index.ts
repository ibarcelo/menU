// ──────────────────────────────────────────────
// Shared TypeScript types
// ──────────────────────────────────────────────

export type SessionStatus = "scanning" | "processing" | "ready" | "error";

export interface Session {
  id: string;
  status: SessionStatus;
  restaurant: string | null;
  expires_at: string;
  created_at: string;
  menu_item_count: number;
}

export interface MenuItem {
  id: string;
  session_id: string;
  category: string;
  name: string;
  description: string | null;
  price: number | null;
  price_text: string | null;
  special_price: boolean;
  tags: string[];
  sort_order: number;
  created_at: string;
}

export interface MenuCategory {
  name: string;
  items: MenuItem[];
}

export interface MenuData {
  session_id: string;
  categories: MenuCategory[];
  total_items: number;
}

export interface Participant {
  id: string;
  session_id: string;
  name: string;
  joined_at: string;
  last_seen_at: string;
}

export interface Order {
  id: string;
  session_id: string;
  participant_id: string;
  menu_item_id: string;
  quantity: number;
  notes: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  menu_item_id: string;
  name: string;
  price: number | null;
  quantity: number;
  notes: string;
  subtotal: number | null;
}

export interface ParticipantOrder {
  participant_id: string;
  participant_name: string;
  items: OrderItem[];
  subtotal: number | null;
}

export interface OrdersSummary {
  participants: ParticipantOrder[];
  grand_total: number | null;
  item_count: number;
}

// ── Saved visits (user profile) ───────────────

export interface SavedVisitItem {
  menu_item_id: string;
  name: string;
  price: number | null;
  quantity: number;
  rating: number | null;   // 1–5
  note: string | null;
  subtotal: number | null;
}

export interface SavedVisit {
  id: string;
  user_id: string;
  restaurant_name: string;
  visited_at: string;
  restaurant_rating: number | null;  // 1–5
  general_note: string | null;
  items: SavedVisitItem[];
  grand_total: number | null;
  created_at: string;
}

// localStorage keys
export const getStorageKey = (sessionId: string) => ({
  participantId: `menu_participant_id_${sessionId}`,
  participantName: `menu_participant_name_${sessionId}`,
  isHost: `menu_is_host_${sessionId}`,
  setup: `menu_setup_${sessionId}`,       // "pending" while SetupGate not completed
});
