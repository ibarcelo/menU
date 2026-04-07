"""
Scan router – handles menu image upload + async AI processing.

Flow:
1. POST /sessions/{id}/scan  →  validates images, stores them, creates scan_job, fires BackgroundTask
2. Background task calls Claude Vision, parses result, bulk-inserts menu_items
3. Frontend receives updates via Supabase Realtime (no polling needed)
"""

import io
import logging
from typing import List

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile
from pydantic import BaseModel

from db.supabase_client import get_settings, get_supabase
from models.menu import ClaudeMenuResponse
from services.ai_vision import detect_media_type, extract_menu_from_images

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sessions", tags=["scan"])

MAX_IMAGES = 5
MAX_BYTES = 10 * 1024 * 1024  # 10 MB per image


class ScanJobResponse(BaseModel):
    scan_job_id: str
    message: str


# ──────────────────────────────────────────────
# Endpoint
# ──────────────────────────────────────────────

@router.post("/{session_id}/scan", response_model=ScanJobResponse, status_code=202)
async def start_scan(
    session_id: str,
    background_tasks: BackgroundTasks,
    images: List[UploadFile] = File(...),
):
    sb = get_supabase()
    settings = get_settings()

    # Validate session exists
    session_result = sb.table("sessions").select("id, status").eq("id", session_id).single().execute()
    if not session_result.data:
        raise HTTPException(status_code=404, detail="Session not found")

    # Validate image count
    if len(images) > MAX_IMAGES:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_IMAGES} images per scan")

    # Read all image bytes eagerly (before background task runs)
    image_bytes_list: List[bytes] = []
    image_media_types: List[str] = []
    image_filenames: List[str] = []

    for upload in images:
        content = await upload.read()
        if len(content) > MAX_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"Image '{upload.filename}' exceeds {settings.max_image_size_mb}MB limit",
            )
        media_type = detect_media_type(upload.filename or "image.jpg", content)
        image_bytes_list.append(content)
        image_media_types.append(media_type)
        image_filenames.append(upload.filename or f"image_{len(image_bytes_list)}.jpg")

    # Create scan job record
    job_result = (
        sb.table("scan_jobs")
        .insert({
            "session_id": session_id,
            "status": "pending",
            "image_count": len(images),
        })
        .execute()
    )
    scan_job_id = job_result.data[0]["id"]

    # Update session status
    sb.table("sessions").update({"status": "processing"}).eq("id", session_id).execute()

    # Fire background task – do not await
    background_tasks.add_task(
        _process_scan,
        session_id=session_id,
        scan_job_id=scan_job_id,
        image_bytes_list=image_bytes_list,
        image_media_types=image_media_types,
        anthropic_api_key=settings.anthropic_api_key,
        openai_api_key=settings.openai_api_key,
    )

    return ScanJobResponse(scan_job_id=scan_job_id, message="Processing started")


@router.get("/{session_id}/scan/{job_id}")
async def get_scan_job(session_id: str, job_id: str):
    sb = get_supabase()
    result = (
        sb.table("scan_jobs")
        .select("*")
        .eq("id", job_id)
        .eq("session_id", session_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Scan job not found")
    return result.data


# ──────────────────────────────────────────────
# Background task
# ──────────────────────────────────────────────

async def _process_scan(
    session_id: str,
    scan_job_id: str,
    image_bytes_list: List[bytes],
    image_media_types: List[str],
    anthropic_api_key: str = "",
    openai_api_key: str = "",
):
    """Runs in background: calls Claude, stores menu items, updates job status."""
    sb = get_supabase()

    # Mark as processing
    sb.table("scan_jobs").update({"status": "processing"}).eq("id", scan_job_id).execute()

    try:
        menu: ClaudeMenuResponse = await extract_menu_from_images(
            image_bytes_list, image_media_types,
            anthropic_api_key=anthropic_api_key,
            openai_api_key=openai_api_key,
        )
    except Exception as exc:
        logger.exception("Claude extraction failed for session %s", session_id)
        sb.table("scan_jobs").update({
            "status": "error",
            "error_message": str(exc),
        }).eq("id", scan_job_id).execute()
        sb.table("sessions").update({"status": "error"}).eq("id", session_id).execute()
        return

    # Persist extracted menu items
    try:
        items_to_insert = []
        sort_order = 0
        for section in menu.sections:
            for item in section.items:
                items_to_insert.append({
                    "session_id": session_id,
                    "category": section.category,
                    "name": item.name,
                    "description": item.description,
                    "price": float(item.price) if item.price is not None else None,
                    "price_text": item.price_text,
                    "special_price": item.special_price,
                    "tags": item.tags,
                    "sort_order": sort_order,
                })
                sort_order += 1

        if items_to_insert:
            sb.table("menu_items").insert(items_to_insert).execute()

        # Archive raw Claude response
        sb.table("sessions").update({
            "status": "ready",
            "restaurant": menu.restaurant,
            "raw_menu_json": menu.model_dump(),
        }).eq("id", session_id).execute()

        sb.table("scan_jobs").update({
            "status": "done",
        }).eq("id", scan_job_id).execute()

        logger.info(
            "Scan done for session %s: %d items across %d sections",
            session_id,
            len(items_to_insert),
            len(menu.sections),
        )

    except Exception as exc:
        logger.exception("DB insert failed for session %s", session_id)
        sb.table("scan_jobs").update({
            "status": "error",
            "error_message": f"DB error: {exc}",
        }).eq("id", scan_job_id).execute()
        sb.table("sessions").update({"status": "error"}).eq("id", session_id).execute()
