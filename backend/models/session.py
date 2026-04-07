from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CreateSessionRequest(BaseModel):
    restaurant: Optional[str] = None


class SessionResponse(BaseModel):
    id: str
    status: str
    restaurant: Optional[str]
    expires_at: datetime
    created_at: datetime
    menu_item_count: int = 0
