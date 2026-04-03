# -*- coding: utf-8 -*-
"""
Financial Report Extract - FastAPI Backend
Parses financial documents via TextIn official API and extracts the three major
financial statements (balance sheet, income statement, cash flow) from detail data.
"""

import os
import re
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

from pathlib import Path
load_dotenv(Path(__file__).parent.parent / ".env")

app = FastAPI(title="Financial Report Extract API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

TEXTIN_APP_ID = os.getenv("TEXTIN_APP_ID", "")
TEXTIN_SECRET_CODE = os.getenv("TEXTIN_SECRET_CODE", "")

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
}

# ──────────────────────────────────────────────────────────────────────────────
# Financial table extraction logic
# ──────────────────────────────────────────────────────────────────────────────

TABLE_TITLE_PATTERNS = {
    "balanceSheet": ["资产负债表", "资产负债"],
    "incomeStatement": ["利润表", "损益表", "收益表"],
    "cashFlow": ["现金流量表", "现金流量"],
}

NUM_REG = re.compile(r"^[\(\-]?\d[\d,\.]*\)?$")


def normalize_title(title: str) -> str:
    if not title:
        return ""
    t = title.replace("**", "")
    return re.sub(r"[\s　*★☆•·\[\]（）()<>《》]", "", t)


def match_table_type(title: str) -> Optional[str]:
    if not title:
        return None
    for ttype, kws in TABLE_TITLE_PATTERNS.items():
        for kw in kws:
            if kw in title:
                return ttype
    return None


def is_numeric_cell(text: str) -> bool:
    if not text:
        return False
    t = text.replace("￥", "").replace("，", ",").strip()
    return bool(NUM_REG.match(t))


def column_numeric_ratio(rows: list, col_idx: int) -> float:
    numeric, total = 0, 0
    for r in rows:
        if col_idx >= len(r):
            continue
        v = r[col_idx]
        if v:
            total += 1
            if is_numeric_cell(v):
                numeric += 1
    return 0.0 if total == 0 else numeric / total


def normalize_financial_table(headers: list, rows: list):
    if not headers or not rows:
        return headers, rows

    col_count = max(len(headers), max((len(r) for r in rows), default=0))

    item_idx = 0
    for i, h in enumerate(headers):
        if any(k in (h or "") for k in ["项目", "科目"]):
            item_idx = i
            break

    exclude_kws = ["附注", "说明", "备注"]
    candidates = []
    for i, h in enumerate(headers):
        if i == item_idx:
            continue
        if any(k in (h or "") for k in exclude_kws):
            continue
        candidates.append((i, column_numeric_ratio(rows, i)))

    candidates.sort(key=lambda x: x[1], reverse=True)
    amount_cols = [i for i, r in candidates if r >= 0.4][:2]
    if not amount_cols:
        return headers, rows

    new_headers = [headers[item_idx]] + [headers[i] for i in amount_cols]
    new_rows = []
    for r in rows:
        r = r + [""] * (col_count - len(r))
        new_rows.append([r[item_idx]] + [r[i] for i in amount_cols])

    return new_headers, new_rows


def html_table_to_matrix(html: str) -> list:
    if not html or "<table" not in html.lower():
        return []
    if BeautifulSoup is None:
        rows = []
        for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", html, flags=re.I | re.S):
            cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr, flags=re.I | re.S)
            clean = [re.sub(r"<[^>]+>", "", c).strip() for c in cells]
            if any(x != "" for x in clean):
                rows.append(clean)
        return rows
    soup = BeautifulSoup(html, "html.parser")
    tb = soup.find("table")
    if tb is None:
        return []
    matrix = []
    for tr in tb.find_all("tr"):
        tds = tr.find_all(["th", "td"])
        row = [c.get_text(strip=True) for c in tds]
        if any(x != "" for x in row):
            matrix.append(row)
    return matrix


def _first_not_none(d: dict, keys: list):
    for k in keys:
        if k in d and d[k] is not None:
            return d[k]
    return None


def cells_to_matrix(cells: list) -> list:
    grid = {}
    max_r, max_c = 0, 0
    for c in cells:
        if not isinstance(c, dict):
            continue
        r = _first_not_none(c, ["row", "row_id", "r"])
        col = _first_not_none(c, ["col", "col_id", "c"])
        txt = c.get("text") or c.get("value") or c.get("content") or ""
        if r is None or col is None:
            continue
        r, col = int(r), int(col)
        grid[(r, col)] = str(txt).strip()
        max_r = max(max_r, r)
        max_c = max(max_c, col)
    matrix = []
    for rr in range(0, max_r + 1):
        row = []
        for cc in range(0, max_c + 1):
            row.append(grid.get((rr, cc), ""))
        if any(x != "" for x in row):
            matrix.append(row)
    return matrix


def is_table_block(item: dict) -> bool:
    if not isinstance(item, dict):
        return False
    typ = (item.get("type") or "").lower()
    sub = (item.get("sub_type") or "").lower()
    if typ == "table" or sub in {"table", "table_body"}:
        return True
    if isinstance(item.get("rows"), list) and item.get("rows"):
        return True
    if isinstance(item.get("cells"), list) and item.get("cells"):
        return True
    html = item.get("table_html") or item.get("html") or item.get("table")
    if isinstance(html, str) and "<table" in html.lower():
        return True
    text = item.get("text")
    if isinstance(text, str) and "<table" in text.lower():
        return True
    return False


def extract_table_matrix_from_block(item: dict) -> list:
    if isinstance(item.get("rows"), list) and item.get("rows"):
        mat = item["rows"]
        if isinstance(mat, list) and len(mat) >= 2 and all(isinstance(r, list) for r in mat):
            return mat
    if isinstance(item.get("cells"), list) and item.get("cells"):
        mat = cells_to_matrix(item["cells"])
        if len(mat) >= 2:
            return mat
    html = item.get("table_html") or item.get("html") or item.get("table")
    if isinstance(html, str) and "<table" in html.lower():
        mat = html_table_to_matrix(html)
        if len(mat) >= 2:
            return mat
    text = item.get("text")
    if isinstance(text, str) and "<table" in text.lower():
        mat = html_table_to_matrix(text)
        if len(mat) >= 2:
            return mat
    return []


def extract_financial_tables(detail_list: list) -> Dict[str, list]:
    out: Dict[str, list] = {"incomeStatement": [], "balanceSheet": [], "cashFlow": []}
    if not isinstance(detail_list, list) or not detail_list:
        return out

    n = len(detail_list)
    for i, item in enumerate(detail_list):
        if not isinstance(item, dict):
            continue
        if item.get("sub_type") != "table_title":
            continue

        title_text_raw = item.get("text") or ""
        title_norm = normalize_title(title_text_raw)
        ttype = match_table_type(title_norm)
        if ttype not in out:
            continue

        title_page_id = item.get("page_id")
        page_id_list: list = []
        if isinstance(title_page_id, int):
            page_id_list = [title_page_id]
        elif isinstance(title_page_id, str):
            nums = re.findall(r"\d+", title_page_id)
            page_id_list = [int(x) for x in nums] if nums else []
        elif isinstance(title_page_id, list):
            page_id_list = [int(x) for x in title_page_id if str(x).isdigit()]

        table_block = None
        for j in range(i + 1, n):
            nxt = detail_list[j]
            if isinstance(nxt, dict) and is_table_block(nxt):
                table_block = nxt
                break

        if not table_block:
            continue

        matrix = extract_table_matrix_from_block(table_block)
        if len(matrix) < 2:
            continue

        headers, rows = matrix[0], matrix[1:]
        nh, nr = normalize_financial_table(headers, rows)

        out[ttype].append({"title": title_norm, "page_id": page_id_list, "rows": nr})

    return out


# ──────────────────────────────────────────────────────────────────────────────
# API endpoint
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/api/parse-document")
async def parse_document(file: UploadFile = File(...)):
    """
    Parse a financial report PDF and extract the three major financial statements.
    Returns: { status, markdown, tables: { balanceSheet, incomeStatement, cashFlow } }
    """
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

    # Request detail data for table extraction
    params = dict(TEXTIN_PARAMS)
    params["markdown_details"] = 1

    async with httpx.AsyncClient(timeout=300.0) as client:
        resp = await client.post(
            TEXTIN_API_URL,
            headers=headers,
            params=params,
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
    markdown = result.get("markdown", "")
    detail_list = result.get("detail", [])

    tables = extract_financial_tables(detail_list)

    return {
        "status": "success",
        "markdown": markdown,
        "tables": tables,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
