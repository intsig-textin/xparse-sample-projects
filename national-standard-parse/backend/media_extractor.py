# -*- coding: utf-8 -*-
"""
从 detail 数组中提取所有表格 / 图片元素。
- 关联紧邻在前的 caption（sub_type='table_title' | 'image_title'）作为标题
- 通过 outline_level 反推所在章节路径
- caption 必须紧邻媒体元素（之间不能夹其他正文）
"""

from typing import Any


def extract_media_items(detail: list[dict[str, Any]]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    heading_stack: list[dict[str, Any]] = []
    pending_caption: str | None = None
    table_count = 0
    image_count = 0

    for i, d in enumerate(detail):
        level = d.get("outline_level", -1)
        if level is None:
            level = -1
        d_type = d.get("type", "")
        sub_type = d.get("sub_type")
        text = (d.get("text") or "").strip()

        is_heading = d_type == "title" or (level >= 0 and d_type not in ("table", "image"))
        is_caption = sub_type in ("table_title", "image_title")

        if is_heading:
            lvl = max(0, level)
            heading_stack = [h for h in heading_stack if h["level"] < lvl]
            heading_stack.append({"text": text, "level": lvl})
            pending_caption = None
            continue

        if is_caption:
            pending_caption = text
            continue

        if d_type == "table":
            table_count += 1
            items.append({
                "id": f"table_{table_count}",
                "index": table_count,
                "type": "table",
                "page": d.get("page_id"),
                "caption": pending_caption,
                "path": " › ".join(h["text"] for h in heading_stack),
                "parentTitle": heading_stack[-1]["text"] if heading_stack else "",
                "detailIndex": i,
                "content": d.get("text") or "",
                "position": d.get("position") or [],
            })
            pending_caption = None
            continue

        if d_type == "image":
            image_count += 1
            items.append({
                "id": f"image_{image_count}",
                "index": image_count,
                "type": "image",
                "page": d.get("page_id"),
                "caption": pending_caption,
                "path": " › ".join(h["text"] for h in heading_stack),
                "parentTitle": heading_stack[-1]["text"] if heading_stack else "",
                "detailIndex": i,
                "content": d.get("image_url") or d.get("text") or "",
                "position": d.get("position") or [],
            })
            pending_caption = None
            continue

        # 普通正文：清掉 pending caption（caption 必须紧邻媒体元素）
        if pending_caption:
            pending_caption = None

    return items
