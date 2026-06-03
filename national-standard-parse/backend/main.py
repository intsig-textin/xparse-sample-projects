# -*- coding: utf-8 -*-
"""
National Standard Parse - FastAPI Backend
- /api/parse  : 调 TextIn pdf_to_markdown，并在后端完成 chunk / 媒体提取 / markdown 重建
- /api/extract: 通用 LLM 代理（OpenAI 兼容），保留口子供二次开发，当前 demo 不调用
- /api/image  : 代理 TextIn 单页图片下载（带凭证）
"""

import json
import os
import re
from pathlib import Path
from typing import Any, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from chunker import build_catalog_from_detail, generate_chunks
from markdown_builder import build_markdown_with_map
from media_extractor import extract_media_items

load_dotenv(Path(__file__).parent.parent / ".env")

app = FastAPI(title="National Standard Parse API")

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
TEXTIN_IMAGE_URL = "https://api.textin.com/ocr_image/download"

# 国家标准书 demo 专用 OCR 参数：保留页眉页脚（前端切换 includeParatext 时本地切换 chunks，
# 不会重新 OCR），开启文档树/目录/markdown 细节，提取页面图片用于左侧预览
TEXTIN_PARAMS = {
    "page_start": 0,
    "page_count": 200,
    "dpi": 144,
    "parse_mode": "auto",
    "table_flavor": "html",
    "formula_level": 0,
    "apply_document_tree": 1,
    "markdown_details": 1,
    "catalog_details": 1,
    "page_details": 1,
    "get_image": "both",
    "apply_merge": 1,
    "remove_watermark": 1,
    "paratext_mode": "annotation",
}


@app.post("/api/parse")
async def parse_document(file: UploadFile = File(...)):
    """OCR + chunk + media + markdown 一次返回。"""
    if not TEXTIN_APP_ID or not TEXTIN_SECRET_CODE:
        raise HTTPException(
            status_code=500,
            detail="TEXTIN_APP_ID 和 TEXTIN_SECRET_CODE 未配置，请检查 .env 文件",
        )

    content = await file.read()
    headers = {
        "x-ti-app-id": TEXTIN_APP_ID,
        "x-ti-secret-code": TEXTIN_SECRET_CODE,
        "Content-Type": "application/octet-stream",
    }

    async with httpx.AsyncClient(timeout=300.0) as client:
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
    raw_pages = result.get("pages") or []
    pages = [
        {
            "page_id": p.get("page_id", idx + 1),
            "image_id": p.get("image_id", ""),
            "width": p.get("width", 0),
            "height": p.get("height", 0),
            "angle": p.get("angle", 0),
            "content": p.get("content") or [],
        }
        for idx, p in enumerate(raw_pages)
    ]

    detail = result.get("detail") or []
    catalog = result.get("catalog") or build_catalog_from_detail(detail)

    chunks = generate_chunks(detail, include_paratext=False)
    chunks_with_paratext = generate_chunks(detail, include_paratext=True)
    media = extract_media_items(detail)
    md_pack = build_markdown_with_map(detail)

    return {
        "markdown": result.get("markdown", ""),
        "pages": pages,
        "detail": detail,
        "catalog": catalog,
        "chunks": chunks,
        "chunks_with_paratext": chunks_with_paratext,
        "media": media,
        "rebuilt_markdown": md_pack["markdown"],
        "lineToDetail": md_pack["lineToDetail"],
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
    """通用 LLM 抽取代理，保留口子供二次开发（当前 demo 不调用）。"""
    if not OPENAI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY 未配置，请检查 .env 文件",
        )

    markdown = req.markdown or ""
    model = req.model or OPENAI_MODEL
    user_message = f"{req.prompt}\n\n## 文档内容\n\n{markdown}"

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
    async with httpx.AsyncClient(timeout=280.0) as client:
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

    return {"code": 200, "result": {"llm_json": llm_json, "raw_json": {}}}


@app.get("/api/image")
async def get_page_image(image_id: str):
    """代理 TextIn 单页图片下载（base64 形式）。"""
    if not TEXTIN_APP_ID or not TEXTIN_SECRET_CODE:
        raise HTTPException(status_code=500, detail="TextIn 凭证未配置")
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            TEXTIN_IMAGE_URL,
            headers={"x-ti-app-id": TEXTIN_APP_ID, "x-ti-secret-code": TEXTIN_SECRET_CODE},
            params={"image_id": image_id},
        )
    if not resp.is_success:
        raise HTTPException(
            status_code=resp.status_code,
            detail=f"图片下载失败: {resp.text[:200]}",
        )
    return resp.json()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
