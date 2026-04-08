"use client";

/**
 * Main session page – handles the full lifecycle:
 * 1. Name gate (first visit → enter name → join session)
 * 2. Scan tab (host: upload images → AI processing)
 * 3. Menu tab (browse + add to order)
 * 4. Orders tab (see everyone's picks + totals)
 *
 * Real-time updates arrive via Supabase Realtime subscriptions.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { UtensilsCrossed, ScanLine, ListOrdered, Receipt, UserCircle2 } from "lucide-react";

import { getStorageKey, type Session, type Participant, type OrdersSummary } from "@/types";
import { getSession, joinSession, heartbeat as sendHeartbeat } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

import NameGate from "@/components/session/NameGate";
import QRShare from "@/components/session/QRShare";
import ScanTab from "@/components/scan/ScanTab";
import MenuTab from "@/components/menu/MenuTab";
import OrdersTab from "@/components/orders/OrdersTab";
import AuthModal from "@/components/auth/AuthModal";
import SaveVisitModal from "@/components/session/SaveVisitModal";

type Tab = "scan" | "menu" | "orders";

interface PageProps {
  params: { id: string };
}

export default function SessionPage({ params }: PageProps) {
  const sessionId = params.id;
  const router = useRouter();
  const { user } = useAuth();
  const prevUserRef = useRef<string | null>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("menu");
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({});

  // Auth & save modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [saveModalSummary, setSaveModalSummary] = useState<OrdersSummary | null>(null);
  const pendingSummaryRef = useRef<OrdersSummary | null>(null);

  // Show welcome toast when user signs in
  useEffect(() => {
    if (user && prevUserRef.current === null) {
      toast.success("You're signed in! You can now save your visit.");
      // Auto-open save modal if save was pending
      if (pendingSummaryRef.current) {
        setSaveModalSummary(pendingSummaryRef.current);
        pendingSummaryRef.current = null;
        setShowAuthModal(false);
      }
    }
    prevUserRef.current = user?.id ?? null;
  }, [user]);

  // ── Restore identity from localStorage ─────────────────
  useEffect(() => {
    const keys = getStorageKey(sessionId);
    const storedId = localStorage.getItem(keys.participantId);
    const storedName = localStorage.getItem(keys.participantName);
    const storedHost = localStorage.getItem(keys.isHost) === "true";

    setIsHost(storedHost);

    if (storedId && storedName) {
      setParticipant({
        id: storedId,
        name: storedName,
        session_id: sessionId,
        joined_at: "",
        last_seen_at: "",
      });
    }
  }, [sessionId]);

  // ── Load session ────────────────────────────────────────
  useEffect(() => {
    getSession(sessionId)
      .then((s) => {
        setSession(s);
        if (s.status === "ready" && s.menu_item_count > 0) {
          setActiveTab("menu");
        } else {
          setActiveTab("scan");
        }
      })
      .catch(() => {
        toast.error("Session not found");
        router.push("/");
      })
      .finally(() => setLoading(false));
  }, [sessionId, router]);

  // ── Heartbeat ───────────────────────────────────────────
  useEffect(() => {
    if (!participant) return;
    const interval = setInterval(() => {
      sendHeartbeat(sessionId, participant.id).catch(() => {});
    }, 30_000);
    return () => clearInterval(interval);
  }, [sessionId, participant]);

  // ── Join (name gate submit) ─────────────────────────────
  const handleJoin = useCallback(
    async (name: string) => {
      try {
        const p = await joinSession(sessionId, name);
        const keys = getStorageKey(sessionId);
        localStorage.setItem(keys.participantId, p.id);
        localStorage.setItem(keys.participantName, p.name);
        setParticipant(p);
      } catch (err) {
        toast.error("Could not join. Name might be taken.");
        throw err;
      }
    },
    [sessionId]
  );

  // ── Session status updates (from ScanTab) ──────────────
  const handleSessionUpdate = useCallback((updated: Partial<Session>) => {
    setSession((prev) => (prev ? { ...prev, ...updated } : prev));
  }, []);

  // ── Save visit trigger ──────────────────────────────────
  const handleSaveVisit = useCallback(
    (summary: OrdersSummary) => {
      if (!user) {
        pendingSummaryRef.current = summary;
        setShowAuthModal(true);
      } else {
        setSaveModalSummary(summary);
      }
    },
    [user]
  );

  // ──────────────────────────────────────────────
  if (loading) return <FullPageSpinner />;
  if (!session) return null;

  if (!participant) {
    return (
      <NameGate
        sessionId={sessionId}
        restaurant={session.restaurant}
        defaultName={user?.user_metadata?.username ?? ""}
        onJoin={handleJoin}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between safe-top">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="w-5 h-5 text-brand" />
          <span className="font-bold text-gray-900 truncate max-w-[140px]">
            {session.restaurant ?? "Our Table"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400 truncate max-w-[80px]">{participant.name}</span>
          <button
            onClick={() => setShowQR(true)}
            className="bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-full"
          >
            Share
          </button>
          {/* Profile / sign-in button */}
          {user ? (
            <button
              onClick={() => router.push("/profile")}
              className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center"
              title="Profile"
            >
              <UserCircle2 className="w-5 h-5 text-brand" />
            </button>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
              title="Sign in"
            >
              <UserCircle2 className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>
      </header>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {activeTab === "scan" && (
          <ScanTab
            sessionId={sessionId}
            session={session}
            isHost={isHost}
            onSessionUpdate={handleSessionUpdate}
            onMenuReady={() => setActiveTab("menu")}
          />
        )}
        {activeTab === "menu" && (
          <MenuTab
            sessionId={sessionId}
            session={session}
            participantId={participant.id}
            isHost={isHost}
            cart={cart}
            setCart={setCart}
            onGoToOrders={() => setActiveTab("orders")}
          />
        )}
        {activeTab === "orders" && (
          <OrdersTab
            sessionId={sessionId}
            participantId={participant.id}
            onSaveVisit={handleSaveVisit}
          />
        )}
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 safe-bottom z-10">
        <div className="flex">
          {(
            [
              { id: "scan", label: "Scan", Icon: ScanLine },
              { id: "menu", label: "Menu", Icon: ListOrdered },
              { id: "orders", label: "Orders", Icon: Receipt },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-4 text-xs font-semibold transition-colors ${
                activeTab === id
                  ? "text-brand"
                  : "text-gray-400 active:text-gray-600"
              }`}
            >
              <Icon className="w-6 h-6" />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* QR share modal */}
      {showQR && (
        <QRShare sessionId={sessionId} onClose={() => setShowQR(false)} />
      )}

      {/* Auth modal */}
      {showAuthModal && (
        <AuthModal
          reason="Sign in to save this visit to your profile."
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {/* Save visit modal */}
      {saveModalSummary && session && (
        <SaveVisitModal
          session={session}
          summary={saveModalSummary}
          participantId={participant.id}
          onClose={() => setSaveModalSummary(null)}
          onSaved={() => setSaveModalSummary(null)}
        />
      )}
    </div>
  );
}

function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
