from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class JoinSessionRequest(BaseModel):
    name: str


class ParticipantResponse(BaseModel):
    id: str
    session_id: str
    name: str
    joined_at: datetime


class UpsertOrderRequest(BaseModel):
    participant_id: str
    menu_item_id: str
    quantity: int  # 0 = remove
    notes: str = ""


class OrderItemResponse(BaseModel):
    id: str
    menu_item_id: str
    name: str
    price: Optional[float]
    quantity: int
    notes: str
    subtotal: Optional[float]


class ParticipantOrderResponse(BaseModel):
    participant_id: str
    participant_name: str
    items: List[OrderItemResponse]
    subtotal: Optional[float]


class OrdersSummaryResponse(BaseModel):
    participants: List[ParticipantOrderResponse]
    grand_total: Optional[float]
    item_count: int
