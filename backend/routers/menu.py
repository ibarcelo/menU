from collections import defaultdict
from fastapi import APIRouter, HTTPException
from db.supabase_client import get_supabase
from models.menu import MenuItemCreate, MenuItemUpdate, MenuResponse, MenuCategoryResponse, MenuItemResponse

router = APIRouter(prefix="/sessions", tags=["menu"])


@router.get("/{session_id}/menu", response_model=MenuResponse)
async def get_menu(session_id: str):
    sb = get_supabase()

    result = (
        sb.table("menu_items")
        .select("*")
        .eq("session_id", session_id)
        .order("category")
        .order("sort_order")
        .execute()
    )

    # Group by category
    by_category: dict[str, list] = defaultdict(list)
    for item in result.data:
        by_category[item["category"]].append(item)

    categories = [
        MenuCategoryResponse(name=cat, items=[MenuItemResponse(**i) for i in items])
        for cat, items in by_category.items()
    ]

    return MenuResponse(
        session_id=session_id,
        categories=categories,
        total_items=len(result.data),
    )


@router.post("/{session_id}/menu", status_code=201)
async def add_menu_item(session_id: str, body: MenuItemCreate):
    sb = get_supabase()

    # Verify session
    _assert_session_exists(sb, session_id)

    result = (
        sb.table("menu_items")
        .insert({**body.model_dump(), "session_id": session_id})
        .execute()
    )
    return result.data[0]


@router.patch("/{session_id}/menu/{item_id}")
async def update_menu_item(session_id: str, item_id: str, body: MenuItemUpdate):
    sb = get_supabase()

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = (
        sb.table("menu_items")
        .update(updates)
        .eq("id", item_id)
        .eq("session_id", session_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Item not found")
    return result.data[0]


@router.delete("/{session_id}/menu/{item_id}", status_code=204)
async def delete_menu_item(session_id: str, item_id: str):
    sb = get_supabase()

    sb.table("menu_items").delete().eq("id", item_id).eq("session_id", session_id).execute()


def _assert_session_exists(sb, session_id: str):
    result = sb.table("sessions").select("id").eq("id", session_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found")
