# -*- coding: utf-8 -*-
"""
Contract Review - FastAPI Backend
Handles document parsing (TextIn official API) and LLM extraction (OpenAI-compatible).
"""

import json
import os
import re
from typing import Any, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from pathlib import Path
load_dotenv(Path(__file__).parent.parent / ".env")

app = FastAPI(title="Contract Review API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

TEXTIN_APP_ID = os.getenv("TEXTIN_APP_ID", "")
TEXTIN_SECRET_CODE = os.getenv("TEXTIN_SECRET_CODE", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "qwen-plus")

TEXTIN_API_URL = "https://api.textin.com/ai/service/v1/pdf_to_markdown"
TEXTIN_PARAMS = {
    "parse_mode": "auto",
    "page_count": 200,
    "dpi": 144,
    "table_flavor": "html",
    "apply_document_tree": 1,
    "markdown_details": 1,
    "page_details": 1,
    "apply_merge": 1,
    "crop_dewarp": 1,
    "remove_watermark": 1,
    "get_image": "both",
}


@app.post("/api/parse")
async def parse_document(file: UploadFile = File(...)):
    """Parse a contract document using TextIn official API."""
    if not TEXTIN_APP_ID or not TEXTIN_SECRET_CODE:
        raise HTTPException(
            status_code=500,
            detail="TEXTIN_APP_ID and TEXTIN_SECRET_CODE are not configured. Check your .env file.",
        )

    content = await file.read()
    headers = {
        "x-ti-app-id": TEXTIN_APP_ID,
        "x-ti-secret-code": TEXTIN_SECRET_CODE,
        "Content-Type": "application/octet-stream",
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            TEXTIN_API_URL,
            headers=headers,
            params=TEXTIN_PARAMS,
            content=content,
        )

    if not resp.is_success:
        raise HTTPException(
            status_code=resp.status_code,
            detail=f"TextIn API error: {resp.text[:500]}",
        )

    data = resp.json()
    if data.get("code") != 200:
        raise HTTPException(
            status_code=502,
            detail=f"TextIn returned error: {data.get('message', 'unknown')}",
        )

    result = data.get("result", {})
    return {
        "markdown": result.get("markdown", ""),
        "pages": result.get("pages", []),
    }


def _parse_json_from_text(text: str) -> Any:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"\s*```\s*$", "", text, flags=re.MULTILINE)
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
    return {}


class ExtractRequest(BaseModel):
    prompt: str
    model: Optional[str] = None
    markdown: Optional[str] = None


@app.post("/api/extract")
async def extract(req: ExtractRequest):
    """Call OpenAI-compatible LLM for contract clause extraction."""
    if not OPENAI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY is not configured. Check your .env file.",
        )

    model = req.model or OPENAI_MODEL
    user_message = f"{req.prompt}\n\n## 合同内容\n\n{req.markdown or ''}"

    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": user_message}],
        "temperature": 0.1,
    }

    base_url = OPENAI_BASE_URL.rstrip("/")
    async with httpx.AsyncClient(timeout=180.0) as client:
        resp = await client.post(
            f"{base_url}/chat/completions",
            headers=headers,
            json=payload,
        )

    if not resp.is_success:
        raise HTTPException(
            status_code=resp.status_code,
            detail=f"LLM API error: {resp.text[:500]}",
        )

    data = resp.json()
    content = data["choices"][0]["message"]["content"]
    llm_json = _parse_json_from_text(content)

    return {"code": 200, "result": {"llm_json": llm_json}}


@app.get("/api/image")
async def get_page_image(image_id: str):
    """Proxy TextIn page image download with auth headers."""
    if not TEXTIN_APP_ID or not TEXTIN_SECRET_CODE:
        raise HTTPException(status_code=500, detail="TextIn credentials not configured.")
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            "https://api.textin.com/ocr_image/download",
            headers={"x-ti-app-id": TEXTIN_APP_ID, "x-ti-secret-code": TEXTIN_SECRET_CODE},
            params={"image_id": image_id},
        )
    if not resp.is_success:
        raise HTTPException(status_code=resp.status_code, detail=f"Image download failed: {resp.text[:200]}")
    return resp.json()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
