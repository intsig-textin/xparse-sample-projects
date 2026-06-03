# -*- coding: utf-8 -*-
"""
按 TextIn outline_level 字段做章节分块。
- 标题块：每遇到一个标题开新 chunk
- 正文块：段落追加到当前标题块
- 表格：独立 chunk，含紧邻 caption
- 图片：独立 chunk（仅当紧邻 caption 时），text 为图片说明
"""

import re
from typing import Any


_CHINESE_RANGE = re.compile(r"[一-鿿㐀-䶿]")


def estimate_tokens(text: str) -> int:
    chinese = len(_CHINESE_RANGE.findall(text))
    ascii_part = _CHINESE_RANGE.sub(" ", text)
    ascii_words = len([w for w in ascii_part.split() if w])
    return chinese + ascii_words


def _heading_path(stack: list[dict[str, Any]]) -> str:
    return " › ".join(h["text"] for h in stack)


def _current_title(stack: list[dict[str, Any]]) -> str:
    return stack[-1]["text"] if stack else "文档正文"


def generate_chunks(detail: list[dict[str, Any]], include_paratext: bool = False) -> list[dict[str, Any]]:
    chunks: list[dict[str, Any]] = []
    heading_stack: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    idx = 0
    pending_caption: dict[str, Any] | None = None

    def flush() -> None:
        nonlocal current, idx
        if not current or not current["text"].strip():
            current = None
            return
        idx += 1
        chunks.append({
            "id": f"chunk_{idx:03d}",
            "title": current["title"],
            "path": current["path"],
            "page": current["page"],
            "text": current["text"].strip(),
            "type": current["type"],
            "tokens": estimate_tokens(current["text"]),
            "detailIndices": current["detailIndices"],
        })
        current = None

    for i, item in enumerate(detail):
        level = item.get("outline_level", -1)
        if level is None:
            level = -1
        item_type = item.get("type", "")
        sub_type = item.get("sub_type")
        text = item.get("text") or ""
        page_id = item.get("page_id", 0)

        is_heading = item_type == "title" or (level >= 0 and item_type not in ("table", "image"))
        is_table = item_type == "table"
        is_image = item_type == "image"
        is_paratext = sub_type in ("header", "footer", "sidebar")
        is_caption = sub_type in ("table_title", "image_title")

        if is_paratext and not include_paratext:
            continue

        if is_caption:
            pending_caption = {"text": text.strip(), "index": i}
            continue

        if is_image:
            if pending_caption:
                flush()
                idx += 1
                cap_text = pending_caption["text"]
                chunks.append({
                    "id": f"chunk_{idx:03d}",
                    "title": f"[图片] {cap_text}",
                    "path": _heading_path(heading_stack),
                    "page": page_id,
                    "text": f"[图片说明] {cap_text}",
                    "type": "body",
                    "tokens": estimate_tokens(cap_text),
                    "detailIndices": [pending_caption["index"], i],
                })
                pending_caption = None
            continue

        if is_table:
            flush()
            cap_text = pending_caption["text"] if pending_caption else ""
            cap_indices = [pending_caption["index"]] if pending_caption else []
            table_body = text or "(表格内容)"
            table_text = f"{cap_text}\n\n{table_body}" if cap_text else table_body
            idx += 1
            chunks.append({
                "id": f"chunk_{idx:03d}",
                "title": f"[表格] {cap_text}" if cap_text else f"[表格] {_current_title(heading_stack)}",
                "path": _heading_path(heading_stack),
                "page": page_id,
                "text": table_text,
                "type": "table",
                "tokens": estimate_tokens(table_text),
                "detailIndices": [*cap_indices, i],
            })
            pending_caption = None
            continue

        if is_heading:
            flush()
            pending_caption = None
            heading_level = max(0, level)
            heading_stack = [h for h in heading_stack if h["level"] < heading_level]
            heading_stack.append({"text": text.strip(), "level": heading_level})
            current = {
                "title": text.strip(),
                "path": _heading_path(heading_stack),
                "page": page_id,
                "text": text.strip(),
                "type": "heading",
                "detailIndices": [i],
            }
            continue

        # Body paragraph — flush dangling caption first into current chunk
        if pending_caption:
            if current is None:
                title = _current_title(heading_stack)
                current = {
                    "title": title,
                    "path": _heading_path(heading_stack) if heading_stack else title,
                    "page": page_id,
                    "text": "",
                    "type": "body",
                    "detailIndices": [],
                }
            current["text"] += ("\n\n" if current["text"] else "") + pending_caption["text"]
            current["detailIndices"].append(pending_caption["index"])
            pending_caption = None

        if current is None:
            title = _current_title(heading_stack)
            current = {
                "title": title,
                "path": _heading_path(heading_stack) if heading_stack else title,
                "page": page_id,
                "text": "",
                "type": "body",
                "detailIndices": [],
            }
        current["text"] += ("\n\n" if current["text"] else "") + text
        current["detailIndices"].append(i)

    flush()
    return chunks


def build_catalog_from_detail(detail: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """从 detail 中提取标题层级，构建目录树（API 未返回 catalog 时用作 fallback）。"""
    roots: list[dict[str, Any]] = []
    stack: list[tuple[dict[str, Any], int]] = []

    for d in detail:
        level = d.get("outline_level", -1)
        if level is None or level < 0:
            continue

        node = {
            "text": (d.get("text") or "").strip(),
            "page_id": d.get("page_id"),
            "level": max(0, level),
            "children": [],
        }

        while stack and stack[-1][1] >= node["level"]:
            stack.pop()

        if not stack:
            roots.append(node)
        else:
            stack[-1][0]["children"].append(node)
        stack.append((node, node["level"]))

    return roots
