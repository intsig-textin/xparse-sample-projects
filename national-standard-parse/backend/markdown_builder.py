# -*- coding: utf-8 -*-
"""
用 detail 重建 markdown，并记录每条 detail 的起始行号
（前端 react-markdown 拿 node.position.start.line 反查 detailIndex 实现点击溯源）。
"""

from typing import Any


def build_markdown_with_map(detail: list[dict[str, Any]]) -> dict[str, Any]:
    lines: list[str] = []
    line_to_detail: dict[int, int] = {}

    for idx, d in enumerate(detail):
        start_line = len(lines) + 1
        d_type = d.get("type", "")
        text = d.get("text") or ""
        outline = d.get("outline_level", -1)
        if outline is None:
            outline = -1

        if d_type == "image":
            url = (d.get("image_url") or "").strip()
            block = f"![]({url})" if url else ""
        elif d_type == "table":
            block = text
        elif outline >= 0:
            level = min(6, outline + 1)
            block = f"{'#' * level} {text}"
        else:
            block = text

        if not block:
            continue

        line_to_detail[start_line] = idx
        for ln in block.split("\n"):
            lines.append(ln)
        lines.append("")

    return {
        "markdown": "\n".join(lines),
        # JSON 不允许整数 key，前端拿到后自己 parseInt
        "lineToDetail": {str(k): v for k, v in line_to_detail.items()},
    }
