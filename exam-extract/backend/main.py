# -*- coding: utf-8 -*-
"""
Exam Extract - FastAPI Backend
- /api/parse           : 调 TextIn pdf_to_markdown，返回 markdown / pages / detail
- /api/extract_stream  : 接收 OCR 结果，分批调 LLM，按 SSE 推送批次进度与最终抽取结果
- /api/image           : 代理 TextIn 单页图片下载（带凭证）
"""

import json
import os
from pathlib import Path
from typing import Any, List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from extractor import extract_batched

load_dotenv(Path(__file__).parent.parent / ".env")

app = FastAPI(title="Exam Extract API")

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
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "qwen-flash")

TEXTIN_API_URL = "https://api.textin.com/ai/service/v1/pdf_to_markdown"
TEXTIN_IMAGE_URL = "https://api.textin.com/ocr_image/download"

# 试卷 demo 专用 OCR 参数：开启文档树/markdown 细节，提取页面图片用于左侧预览，
# 公式/下划线识别打开（试卷里大量公式与默写题下划线），最多识别 10 页
TEXTIN_PARAMS = {
    "page_details": 1,
    "get_image": "both",
    "page_start": 0,
    "page_count": 10,
    "dpi": 144,
    "parse_mode": "auto",
    "table_flavor": "html",
    "apply_document_tree": 1,
    "markdown_details": 1,
    "apply_merge": 1,
    "formula_level": 1,
    "underline_level": 1,
    "remove_watermark": 1,
    "paratext_mode": "none",
}


# ─── /api/parse ───────────────────────────────────────────────────────────────

@app.post("/api/parse")
async def parse_document(file: UploadFile = File(...)):
    """OCR 解析，返回 markdown + pages + detail。"""
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

    return {
        "markdown": result.get("markdown", ""),
        "pages": pages,
        "detail": result.get("detail") or [],
    }


# ─── /api/extract_stream ─────────────────────────────────────────────────────

class ExtractStreamRequest(BaseModel):
    pages: List[Any]
    detail: List[Any]


@app.post("/api/extract_stream")
async def extract_stream(req: ExtractStreamRequest):
    """SSE 推送：按批次抽取题目，逐批回报进度，最后回报完整 ExtractionResult。"""
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY 未配置，请检查 .env 文件")

    async def event_stream():
        try:
            async for ev in extract_batched(
                req.pages,
                req.detail,
                api_key=OPENAI_API_KEY,
                base_url=OPENAI_BASE_URL,
                model=OPENAI_MODEL,
            ):
                # SSE 协议：每条事件以 "data: <json>\n\n" 结束
                yield f"data: {json.dumps(ev, ensure_ascii=False)}\n\n"
        except Exception as exc:  # noqa: BLE001
            err = {"type": "error", "message": f"内部错误：{exc}"}
            yield f"data: {json.dumps(err, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # 部分反向代理需关 buffering 才能流式输出
        },
    )


# ─── /api/image ───────────────────────────────────────────────────────────────

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
