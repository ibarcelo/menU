"""
AI Vision Service – extracts structured menu data from images.

Supports two providers (auto-selected based on which API key is set):
  1. OpenAI GPT-4o  (OPENAI_API_KEY)
  2. Anthropic Claude (ANTHROPIC_API_KEY)

Pipeline:
  - Send all images in a single API call
  - Validate output with Pydantic
  - One retry with correction prompt if validation fails
"""

import base64
import json
import re
import logging
from typing import List

from models.menu import ClaudeMenuResponse  # shared schema regardless of provider

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# Prompts
# ──────────────────────────────────────────────

SYSTEM_PROMPT = """You are a menu digitization assistant. Your only job is to extract
structured data from restaurant menu images. Always respond with valid JSON and
nothing else — no markdown fences, no explanation, no extra text."""

EXTRACTION_PROMPT = """Analyze the restaurant menu image(s) and extract every dish.
Include ALL visible items across ALL provided images.

Return exactly this JSON structure:
{
  "restaurant": "restaurant name or null",
  "sections": [
    {
      "category": "section name (e.g. Starters, Mains, Desserts, Drinks)",
      "items": [
        {
          "name": "dish name",
          "description": "brief description or null",
          "price": 12.50,
          "price_text": "$12.50",
          "special_price": false,
          "tags": []
        }
      ]
    }
  ]
}

Rules:
1. price must be a float — strip currency symbols. "$12.50" → 12.50
2. If price is missing or shows "MP" / "market price" / "según mercado":
   set price=null, price_text=<raw text>, special_price=true
3. description: null if not shown on the menu
4. tags: only use these values: ["spicy","vegan","vegetarian","gluten-free","new","popular"]
5. De-duplicate: same dish across multiple images → include once only
6. Keep original language for dish names — do NOT translate
7. Return ONLY the JSON object. No markdown. No explanation."""

CORRECTION_PROMPT = """Your previous response was not valid JSON matching the required schema.
Error: {error}
Try again — return ONLY the JSON object, nothing else."""


# ──────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────

async def extract_menu_from_images(
    image_bytes_list: List[bytes],
    image_media_types: List[str],
    anthropic_api_key: str = "",
    openai_api_key: str = "",
) -> ClaudeMenuResponse:
    """
    Auto-selects provider based on which key is provided.
    Raises ValueError if extraction fails after retry.
    """
    if openai_api_key:
        return await _extract_openai(image_bytes_list, image_media_types, openai_api_key)
    elif anthropic_api_key:
        return await _extract_anthropic(image_bytes_list, image_media_types, anthropic_api_key)
    else:
        raise ValueError("No AI API key configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY in .env")


# ──────────────────────────────────────────────
# OpenAI GPT-4o
# ──────────────────────────────────────────────

async def _extract_openai(
    image_bytes_list: List[bytes],
    image_media_types: List[str],
    api_key: str,
) -> ClaudeMenuResponse:
    from openai import OpenAI

    client = OpenAI(api_key=api_key)

    # Build content: text prompt first, then images
    content: list = [{"type": "text", "text": EXTRACTION_PROMPT}]
    for img_bytes, media_type in zip(image_bytes_list, image_media_types):
        b64 = base64.standard_b64encode(img_bytes).decode("utf-8")
        content.append({
            "type": "image_url",
            "image_url": {"url": f"data:{media_type};base64,{b64}", "detail": "high"},
        })

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": content},
    ]

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        max_tokens=4096,
        temperature=0,
    )
    raw_text = response.choices[0].message.content or ""
    logger.debug("OpenAI raw response (first 500): %s", raw_text[:500])

    try:
        return _parse_and_validate(raw_text)
    except (ValueError, json.JSONDecodeError) as err:
        logger.warning("First parse failed: %s — retrying", err)

    # Retry
    messages.append({"role": "assistant", "content": raw_text})
    messages.append({"role": "user", "content": CORRECTION_PROMPT.format(error=str(err))})
    retry = client.chat.completions.create(
        model="gpt-4o", messages=messages, max_tokens=4096, temperature=0
    )
    retry_text = retry.choices[0].message.content or ""
    return _parse_and_validate(retry_text)


# ──────────────────────────────────────────────
# Anthropic Claude
# ──────────────────────────────────────────────

async def _extract_anthropic(
    image_bytes_list: List[bytes],
    image_media_types: List[str],
    api_key: str,
) -> ClaudeMenuResponse:
    import anthropic

    client = anthropic.Anthropic(api_key=api_key)

    content: list = []
    for img_bytes, media_type in zip(image_bytes_list, image_media_types):
        b64 = base64.standard_b64encode(img_bytes).decode("utf-8")
        content.append({
            "type": "image",
            "source": {"type": "base64", "media_type": media_type, "data": b64},
        })
    content.append({"type": "text", "text": EXTRACTION_PROMPT})

    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": content}],
    )
    raw_text = response.content[0].text.strip()

    try:
        return _parse_and_validate(raw_text)
    except (ValueError, json.JSONDecodeError) as err:
        logger.warning("First parse failed: %s — retrying", err)

    retry_response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": content},
            {"role": "assistant", "content": raw_text},
            {"role": "user", "content": CORRECTION_PROMPT.format(error=str(err))},
        ],
    )
    retry_text = retry_response.content[0].text.strip()
    return _parse_and_validate(retry_text)


# ──────────────────────────────────────────────
# Shared helpers
# ──────────────────────────────────────────────

def _parse_and_validate(text: str) -> ClaudeMenuResponse:
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.MULTILINE).strip()
    data = json.loads(cleaned)
    menu = ClaudeMenuResponse.model_validate(data)

    if not menu.sections:
        raise ValueError("No menu sections found in response")

    for section in menu.sections:
        for item in section.items:
            if item.price is not None:
                try:
                    item.price = float(item.price)
                except (TypeError, ValueError):
                    item.price = None
                    item.special_price = True
    return menu


def detect_media_type(filename: str, content: bytes) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    ext_map = {
        "jpg": "image/jpeg", "jpeg": "image/jpeg",
        "png": "image/png", "gif": "image/gif",
        "webp": "image/webp", "heic": "image/jpeg", "heif": "image/jpeg",
    }
    if ext in ext_map:
        return ext_map[ext]
    if content[:2] == b"\xff\xd8":
        return "image/jpeg"
    if content[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    return "image/jpeg"
