from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class MenuItemCreate(BaseModel):
    category: str = "Other"
    name: str
    description: Optional[str] = None
    price: Optional[float] = None
    price_text: Optional[str] = None
    special_price: bool = False
    tags: List[str] = []
    sort_order: int = 0


class MenuItemUpdate(BaseModel):
    category: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    price_text: Optional[str] = None
    special_price: Optional[bool] = None
    tags: Optional[List[str]] = None


class MenuItemResponse(BaseModel):
    id: str
    session_id: str
    category: str
    name: str
    description: Optional[str]
    price: Optional[float]
    price_text: Optional[str]
    special_price: bool
    tags: List[str]
    sort_order: int
    created_at: datetime


class MenuCategoryResponse(BaseModel):
    name: str
    items: List[MenuItemResponse]


class MenuResponse(BaseModel):
    session_id: str
    categories: List[MenuCategoryResponse]
    total_items: int


# Shape Claude must return
class ClaudeMenuItem(BaseModel):
    name: str
    description: Optional[str] = None
    price: Optional[float] = None
    price_text: Optional[str] = None
    special_price: bool = False
    tags: List[str] = []


class ClaudeMenuSection(BaseModel):
    category: str
    items: List[ClaudeMenuItem]


class ClaudeMenuResponse(BaseModel):
    restaurant: Optional[str] = None
    sections: List[ClaudeMenuSection]
