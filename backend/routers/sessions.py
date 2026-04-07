from fastapi import APIRouter, HTTPException
from db.supabase_client import get_supabase
from models.session import CreateSessionRequest, SessionResponse

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=SessionResponse, status_code=201)
async def create_session(body: CreateSessionRequest):
    sb = get_supabase()

    result = (
        sb.table("sessions")
        .insert({"restaurant": body.restaurant, "status": "scanning"})
        .execute()
    )
    session = result.data[0]

    # Count menu items (0 at creation)
    return {**session, "menu_item_count": 0}


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str):
    sb = get_supabase()

    result = sb.table("sessions").select("*").eq("id", session_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found")

    session = result.data

    count_result = (
        sb.table("menu_items")
        .select("id", count="exact")
        .eq("session_id", session_id)
        .execute()
    )
    menu_item_count = count_result.count or 0

    return {**session, "menu_item_count": menu_item_count}
