from fastapi import APIRouter, HTTPException
from db.supabase_client import get_supabase
from models.order import (
    JoinSessionRequest,
    ParticipantResponse,
    UpsertOrderRequest,
    OrdersSummaryResponse,
    ParticipantOrderResponse,
    OrderItemResponse,
)

router = APIRouter(prefix="/sessions", tags=["orders"])


# ──────────────────────────────────────────────
# Participants
# ──────────────────────────────────────────────

@router.post("/{session_id}/participants", response_model=ParticipantResponse, status_code=201)
async def join_session(session_id: str, body: JoinSessionRequest):
    """Join a session with a name. Returns 409 if name already taken."""
    sb = get_supabase()

    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")

    # Verify session
    session = sb.table("sessions").select("id").eq("id", session_id).single().execute()
    if not session.data:
        raise HTTPException(status_code=404, detail="Session not found")

    # Check for existing name
    existing = (
        sb.table("participants")
        .select("*")
        .eq("session_id", session_id)
        .eq("name", name)
        .execute()
    )
    if existing.data:
        # Return existing participant (idempotent join)
        return existing.data[0]

    result = (
        sb.table("participants")
        .insert({"session_id": session_id, "name": name})
        .execute()
    )
    return result.data[0]


@router.patch("/{session_id}/participants/{participant_id}/heartbeat")
async def heartbeat(session_id: str, participant_id: str):
    """Update last_seen_at for presence tracking."""
    sb = get_supabase()
    from datetime import datetime, timezone

    result = (
        sb.table("participants")
        .update({"last_seen_at": datetime.now(timezone.utc).isoformat()})
        .eq("id", participant_id)
        .eq("session_id", session_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Participant not found")
    return {"last_seen_at": result.data[0]["last_seen_at"]}


@router.get("/{session_id}/participants")
async def list_participants(session_id: str):
    sb = get_supabase()
    result = (
        sb.table("participants")
        .select("*")
        .eq("session_id", session_id)
        .order("joined_at")
        .execute()
    )
    return result.data


# ──────────────────────────────────────────────
# Orders
# ──────────────────────────────────────────────

@router.put("/{session_id}/orders")
async def upsert_order(session_id: str, body: UpsertOrderRequest):
    """
    Upsert an order item. quantity=0 removes the item.
    Uses DB UNIQUE(session_id, participant_id, menu_item_id) for upsert.
    """
    sb = get_supabase()

    if body.quantity == 0:
        # Delete
        sb.table("orders").delete().eq("session_id", session_id).eq(
            "participant_id", body.participant_id
        ).eq("menu_item_id", body.menu_item_id).execute()
        return {"deleted": True}

    from datetime import datetime, timezone

    result = (
        sb.table("orders")
        .upsert(
            {
                "session_id": session_id,
                "participant_id": body.participant_id,
                "menu_item_id": body.menu_item_id,
                "quantity": body.quantity,
                "notes": body.notes,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            on_conflict="session_id,participant_id,menu_item_id",
        )
        .execute()
    )
    return result.data[0]


@router.get("/{session_id}/orders", response_model=OrdersSummaryResponse)
async def get_orders(session_id: str):
    """Get all orders grouped by participant with totals."""
    sb = get_supabase()

    # Fetch orders joined with participant name and menu item price
    orders_result = (
        sb.table("orders")
        .select(
            "id, quantity, notes, updated_at, "
            "participants!inner(id, name), "
            "menu_items!inner(id, name, price)"
        )
        .eq("session_id", session_id)
        .gt("quantity", 0)
        .execute()
    )

    # Group by participant
    by_participant: dict[str, dict] = {}
    for row in orders_result.data:
        p = row["participants"]
        m = row["menu_items"]
        pid = p["id"]

        if pid not in by_participant:
            by_participant[pid] = {
                "participant_id": pid,
                "participant_name": p["name"],
                "items": [],
            }

        price = m.get("price")
        quantity = row["quantity"]
        subtotal = round(price * quantity, 2) if price else None

        by_participant[pid]["items"].append(
            OrderItemResponse(
                id=row["id"],
                menu_item_id=m["id"],
                name=m["name"],
                price=price,
                quantity=quantity,
                notes=row.get("notes", ""),
                subtotal=subtotal,
            )
        )

    # Compute totals
    participants_list = []
    grand_total = 0.0
    grand_total_known = False
    total_items = 0

    for pid, data in by_participant.items():
        subtotal = None
        sub_sum = 0.0
        all_known = True
        for item in data["items"]:
            total_items += item.quantity
            if item.subtotal is not None:
                sub_sum += item.subtotal
                grand_total += item.subtotal
                grand_total_known = True
            else:
                all_known = False
        if all_known and data["items"]:
            subtotal = round(sub_sum, 2)

        participants_list.append(
            ParticipantOrderResponse(
                participant_id=data["participant_id"],
                participant_name=data["participant_name"],
                items=data["items"],
                subtotal=subtotal,
            )
        )

    return OrdersSummaryResponse(
        participants=participants_list,
        grand_total=round(grand_total, 2) if grand_total_known else None,
        item_count=total_items,
    )
