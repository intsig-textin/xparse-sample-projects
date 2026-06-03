# -*- coding: utf-8 -*-
"""试卷题目分批抽取核心：将 OCR 结果按页切批，逐批送 LLM，输出题组结构。

对外暴露 ``extract_batched``，是一个异步生成器，会陆续 yield:
  - ``{"type": "progress", "done": int, "total": int}``
  - ``{"type": "done", "extraction": ExtractionResult}``
  - ``{"type": "error", "message": str}``
方便 FastAPI 用 SSE 推送给前端。
"""

import json
import re
from typing import Any, AsyncIterator, Dict, List, Optional

import httpx

from prompts import BatchContinuation, build_batch_extraction_prompt

BATCH_PAGE_SIZE = 10
LLM_TIMEOUT_SECONDS = 360.0


# ─── helpers ──────────────────────────────────────────────────────────────────

def _str(v: Any) -> Optional[str]:
    if v is None or v == "":
        return None
    return str(v)


def _bool(v: Any) -> bool:
    if isinstance(v, bool):
        return v
    if isinstance(v, str):
        return v.lower() == "true"
    return False


def _num(v: Any) -> Optional[float]:
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return v
    if isinstance(v, str):
        try:
            return float(v)
        except ValueError:
            return None
    return None


def _arr(v: Any) -> List[Any]:
    return v if isinstance(v, list) else []


def _obj(v: Any) -> Dict[str, Any]:
    return v if isinstance(v, dict) else {}


def _str_arr(v: Any) -> List[str]:
    out = []
    for x in _arr(v):
        s = _str(x)
        if s is not None:
            out.append(s)
    return out


def _num_arr(v: Any) -> List[int]:
    out = []
    for x in _arr(v):
        n = _num(x)
        if n is not None:
            out.append(int(n))
    return out


def _parse_json_from_text(text: str) -> Dict[str, Any]:
    """LLM 可能用 ```json 包住 JSON，也可能在前后加说明文本，这里做兜底解析。"""
    if not isinstance(text, str):
        return {}
    cleaned = re.sub(r"^```(?:json)?\s*", "", text.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r"\s*```\s*$", "", cleaned, flags=re.MULTILINE).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", cleaned)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
    return {}


# ─── batch markdown builder ───────────────────────────────────────────────────

def build_batch_markdown(detail: List[Dict[str, Any]], page_start: int, page_end: int) -> str:
    """detail 中 type='image' 的项有 image_url；type='table' 的 text 已是 <table>；
    普通段落 text 为 markdown。按 page_id 聚合，每页一个 markdown 块，
    让 LLM 在批次内能看到完整带图的页面内容。"""
    buckets: Dict[int, List[str]] = {}
    for item in detail:
        pid = item.get("page_id")
        if not isinstance(pid, int) or pid < page_start or pid > page_end:
            continue
        bucket = buckets.setdefault(pid, [])
        if item.get("type") == "image" and item.get("image_url"):
            bucket.append(f"![]({item['image_url']})")
        elif item.get("text"):
            bucket.append(item["text"])
    parts = []
    for pid in sorted(buckets.keys()):
        parts.append(f"\n\n========= 第 {pid} 页 =========\n\n" + "\n\n".join(buckets[pid]))
    return "".join(parts)


# ─── parse LLM output ────────────────────────────────────────────────────────

def _parse_paper_meta(raw: Any) -> Optional[Dict[str, Any]]:
    if not isinstance(raw, dict):
        return None
    return {
        "subject": _str(raw.get("subject")) or "未知",
        "grade_level": _str(raw.get("grade_level")) or "未知",
        "exam_type": _str(raw.get("exam_type")) or "未知",
        "has_images": _bool(raw.get("has_images")),
    }


def _parse_question(raw: Dict[str, Any], fallback_page: int) -> Dict[str, Any]:
    options = []
    for o in _arr(raw.get("options")):
        if not isinstance(o, dict):
            continue
        options.append(
            {
                "key": _str(o.get("key")) or "",
                "content": _str(o.get("content")) or _str(o.get("text")) or "",
            }
        )

    score_val = _num(raw.get("score"))
    return {
        "number": _str(raw.get("number")) or _str(raw.get("id")) or "",
        "type": _str(raw.get("type")) or "其他",
        "score": int(score_val) if score_val is not None and score_val == int(score_val) else score_val,
        "stem": _str(raw.get("stem")) or "",
        "options": options,
        "source_page": int(_num(raw.get("source_page")) or fallback_page),
    }


def _parse_groups(raw_llm_json: Dict[str, Any], fallback_page: int) -> List[Dict[str, Any]]:
    parsed = []
    for g in _arr(raw_llm_json.get("groups")):
        if not isinstance(g, dict):
            continue
        questions = []
        declared_pages = _num_arr(g.get("source_pages"))
        first_declared = declared_pages[0] if declared_pages else fallback_page
        for q in _arr(g.get("questions")):
            if not isinstance(q, dict):
                continue
            questions.append(_parse_question(q, first_declared))

        if not questions:
            continue

        source_pages_from_q = sorted({q["source_page"] for q in questions if isinstance(q["source_page"], int)})
        source_pages = declared_pages or source_pages_from_q or [fallback_page]

        parsed.append(
            {
                "group_id": _str(g.get("group_id")) or "",
                "section": _str(g.get("section")),
                "shared_stem": _str(g.get("shared_stem")),
                "questions": questions,
                "source_pages": source_pages,
                "continues_previous": _bool(g.get("continues_previous")),
            }
        )
    return parsed


# ─── LLM call ────────────────────────────────────────────────────────────────

async def _call_llm(
    prompt: str,
    batch_markdown: str,
    *,
    api_key: str,
    base_url: str,
    model: str,
) -> Dict[str, Any]:
    """调 OpenAI 兼容接口，强制要求返回 JSON。"""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    user_message = f"{prompt}\n\n## 待抽取的试卷内容\n\n{batch_markdown}"
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": user_message}],
        "temperature": 0.1,
        "response_format": {"type": "json_object"},
    }
    url = f"{base_url.rstrip('/')}/chat/completions"

    async with httpx.AsyncClient(timeout=LLM_TIMEOUT_SECONDS) as client:
        resp = await client.post(url, headers=headers, json=payload)

    if not resp.is_success:
        raise RuntimeError(f"LLM 接口返回 {resp.status_code}: {resp.text[:300]}")

    data = resp.json()
    content = data["choices"][0]["message"]["content"]
    return _parse_json_from_text(content)


# ─── main extractor (async generator yielding progress events) ───────────────

async def extract_batched(
    pages: List[Dict[str, Any]],
    detail: List[Dict[str, Any]],
    *,
    api_key: str,
    base_url: str,
    model: str,
) -> AsyncIterator[Dict[str, Any]]:
    if not pages:
        yield {
            "type": "done",
            "extraction": {
                "paper_title": None,
                "paper_meta": None,
                "groups": [],
                "warnings": [],
            },
        }
        return

    batches: List[List[Dict[str, Any]]] = []
    for i in range(0, len(pages), BATCH_PAGE_SIZE):
        batches.append(pages[i : i + BATCH_PAGE_SIZE])

    paper_title: Optional[str] = None
    paper_meta: Optional[Dict[str, Any]] = None
    all_groups: List[Dict[str, Any]] = []
    all_warnings: List[str] = []
    next_group_idx = 1
    continuation: Optional[BatchContinuation] = None

    yield {"type": "progress", "done": 0, "total": len(batches)}

    for b_idx, batch in enumerate(batches):
        page_start = batch[0].get("page_id") or b_idx * BATCH_PAGE_SIZE + 1
        page_end = batch[-1].get("page_id") or page_start + len(batch) - 1

        prompt = build_batch_extraction_prompt(
            next_group_idx, page_start, page_end, b_idx == 0, continuation
        )
        batch_markdown = build_batch_markdown(detail, page_start, page_end)

        try:
            raw_llm_json = await _call_llm(
                prompt,
                batch_markdown,
                api_key=api_key,
                base_url=base_url,
                model=model,
            )
        except Exception as exc:  # noqa: BLE001
            yield {"type": "error", "message": f"第 {b_idx + 1} 批抽取失败：{exc}"}
            return

        if paper_title is None:
            paper_title = _str(raw_llm_json.get("paper_title"))
        if paper_meta is None:
            paper_meta = _parse_paper_meta(raw_llm_json.get("paper_meta"))
        all_warnings.extend(_str_arr(raw_llm_json.get("warnings")))

        batch_groups = _parse_groups(raw_llm_json, page_start)

        # 跨批次延续：如果首组标记 continues_previous 且上批末组存在，
        # 把该组的小题并入上批末组
        if batch_groups and batch_groups[0]["continues_previous"] and all_groups:
            head = batch_groups.pop(0)
            tail = all_groups[-1]
            tail["questions"].extend(head["questions"])
            merged = sorted(set(tail["source_pages"]) | set(head["source_pages"]))
            tail["source_pages"] = merged

        # 重新编号 group_id 保证全卷连续
        for g in batch_groups:
            g["group_id"] = f"G{next_group_idx}"
            next_group_idx += 1
            g.pop("continues_previous", None)
            all_groups.append(g)

        # 准备给下一批次的衔接上下文
        if all_groups:
            last_group = all_groups[-1]
            last_question = last_group["questions"][-1] if last_group["questions"] else None
            continuation = {
                "last_group_id": last_group["group_id"],
                "last_section": last_group["section"],
                "last_shared_stem_summary": last_group["shared_stem"],
                "last_question_number": last_question["number"] if last_question else None,
                "last_question_type": last_question["type"] if last_question else None,
            }

        yield {"type": "progress", "done": b_idx + 1, "total": len(batches)}

    yield {
        "type": "done",
        "extraction": {
            "paper_title": paper_title,
            "paper_meta": paper_meta,
            "groups": all_groups,
            "warnings": all_warnings,
        },
    }
