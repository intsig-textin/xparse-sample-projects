# -*- coding: utf-8 -*-
"""
试卷题目结构化抽取 prompt — 单一阶段，直接输出题组（QuestionGroup）结构。
题组包含可选的 shared_stem（共享题干）和一组小题；
独立题表示为只有 1 道小题且 shared_stem=None 的题组。
"""

from typing import Optional, TypedDict

from question_types import PROMPT_QUESTION_TYPE_LIST


class BatchContinuation(TypedDict):
    last_group_id: str
    last_section: Optional[str]
    last_shared_stem_summary: Optional[str]
    last_question_number: Optional[str]
    last_question_type: Optional[str]


SCHEMA = f"""## 输出 JSON（不加 markdown 代码块）

{{
  "paper_title": "...仅首批次填，否则 null",
  "paper_meta": {{ "subject": "数学", "grade_level": "高中", "exam_type": "联考", "has_images": true }},
  "groups": [
    {{
      "group_id": "G1",
      "section": "二、阅读理解 A篇",
      "shared_stem": "...共享题干 markdown，独立题填 null",
      "continues_previous": false,
      "questions": [
        {{
          "number": "21",
          "type": "阅读理解",
          "score": 2,
          "stem": "题干 markdown，保留公式 / ![](url) / <table>",
          "options": [{{ "key": "A", "content": "..." }}, {{ "key": "B", "content": "..." }}],
          "source_page": 5
        }}
      ],
      "source_pages": [5]
    }}
  ],
  "warnings": []
}}

## 字段约束
- paper_title / paper_meta：仅首批次填，后续批次为 null。subject 取标准学科（语文/数学/英语/物理/化学/生物/历史/地理/政治/科学/道德与法治/信息技术/通用技术/综合）；grade_level（小学/初中/高中/大学/职高/其他）；exam_type 自由文本（模拟题/月考/期中/期末/中考/高考/竞赛等）
- group_id：G1/G2... 全卷连续递增
- section：大题归类（"一、选择题"等），无则 null
- shared_stem：多题共享题干填完整 markdown；独立题填 null
- continues_previous：本批第 1 题组延续上批末组（共享题干已在上批）时填 true 且 shared_stem=null；其他 false
- type：取自枚举 {PROMPT_QUESTION_TYPE_LIST}；判不出填"其他"
- score：分值数字，未标注 null
- stem / options[*].content：保留原文公式（$...$）、图片（`![](url)`）、表格（`<table>`）原样，不要改写或替换为描述
- **stem 不得重抄 shared_stem**：若该题组有 shared_stem（阅读文章、完形挖空文章、解答题主干等），questions[*].stem 只写**这一小题独有的提问/小问/空号定位**，绝不再次粘贴整段共享内容。完形填空类每空没有独立题干文本时，stem 填空字符串 `""`
- options：选择题 [{{key, content}}]；非选择题 []
- source_page：取该题首次出现的页码（依据 `========= 第 N 页 =========` 分隔）
- source_pages：题组涉及页码去重升序

## 题组判断
- 英语完形（一段挖空文章 + 每题对应一个空号）：整段挖空文章作 shared_stem，每题 stem 留 `""`，options 4 项
- 阅读 A/B/C/D 篇 / 任务型阅读：文章作 shared_stem，每题 stem 写该题独有的提问
- 文言文 / 现代文阅读：原文作 shared_stem，9-15 题各为小题
- 数学多步解答（17.(1)(2)、22.(1)(2)）：题干作 shared_stem，(1)(2) 作小题
- 一组共用背景的连续选择题：背景作 shared_stem
- 独立题：单题成组，shared_stem=null
- 默写题：原文下划线 `_____` 保留在 stem

## 图片归属（重要）
原文图片以 `![](https://web-api.textin.com/ocr_image/external/...jpg)` 出现，URL 必须逐字符原样输出，不可改写、截断或替换为描述。
按位置归属：
- 紧贴题号下方/题干末尾 → 该题 stem
- 紧跟 A. B. C. D. 之后 → 该选项 content（即使中间有空行）
- 出现在共享段落 → shared_stem
每张原文图都必须出现在 stem / option.content / shared_stem 之一，不得遗漏；不得编造未出现的题或图，扫描瑕疵处写入 warnings。
"""


EXAMPLES = r"""## 示例

[1] 共享文章 + 多小题（阅读理解，每题有独立提问句）：
{ "group_id": "G6", "section": "三、阅读理解", "shared_stem": "Children's birthday is the busiest time at McDonald's. ...",
  "questions": [
    { "number": "51", "type": "阅读理解", "score": 2, "stem": "Where can you have a birthday party?",
      "options": [{"key":"A","content":"At school."},{"key":"B","content":"At home."},{"key":"C","content":"At McDonald's."},{"key":"D","content":"In the park."}],
      "source_page": 5 }
  ], "source_pages": [5] }

[1b] 完形填空（每空没有独立题干文本，stem 必须为 `""`，**严禁把整段挖空文章重抄到每题 stem**）：
{ "group_id": "G2", "section": "二、完形填空", "shared_stem": "Many parents want their children to be famous one day. But do children have the same __21__? A new __22__ ... \"__26__ do they want me to be someone else?\" ... so the audiences can sing the song on their way home after the play!",
  "questions": [
    { "number": "21", "type": "单选题", "score": 2, "stem": "",
      "options": [{"key":"A","content":"jobs"},{"key":"B","content":"dreams"},{"key":"C","content":"habits"},{"key":"D","content":"hobbies"}],
      "source_page": 2 },
    { "number": "22", "type": "单选题", "score": 2, "stem": "",
      "options": [{"key":"A","content":"song"},{"key":"B","content":"film"},{"key":"C","content":"play"},{"key":"D","content":"opera"}],
      "source_page": 2 }
  ], "source_pages": [2] }

[2] 数学解答（共享题干 + 多步小问 + LaTeX）：
{ "group_id": "G17", "section": "三、解答题",
  "shared_stem": "已知数列 $\\{a_n\\}$，$a_1=1$，前 n 项和 $S_n$，$a_{n+1}=\\sqrt{S_{n+1}}+\\sqrt{S_n}$。",
  "questions": [
    { "number": "(1)", "type": "解答题", "score": null, "stem": "求 $\\{a_n\\}$ 通项公式。", "options": [], "source_page": 2 },
    { "number": "(2)", "type": "解答题", "score": null, "stem": "记 $c_n=a_n\\cdot 2^{a_n}$，求 $T_n$。", "options": [], "source_page": 2 }
  ], "source_pages": [2] }

[3] 听力题选项为图片（A./B./C. 后紧跟各自 `![](url)`，必须分别落到对应选项）：
原文：`1. What subject ...?\n\nA.\n\n![](https://.../aaa.jpg)\n\nB.\n\n![](https://.../bbb.jpg)\n\nC.\n\n![](https://.../ccc.jpg)`
输出：
{ "group_id": "G1", "section": "一、听力", "shared_stem": null,
  "questions": [
    { "number": "1", "type": "听力题", "score": 1, "stem": "What subject ...?",
      "options": [
        {"key":"A","content":"![](https://.../aaa.jpg)"},
        {"key":"B","content":"![](https://.../bbb.jpg)"},
        {"key":"C","content":"![](https://.../ccc.jpg)"}
      ],
      "source_page": 1 }
  ], "source_pages": [1] }
"""


def _summarize(text: Optional[str], max_len: int = 100) -> str:
    if not text:
        return "（无）"
    one_line = " ".join(text.split())
    return one_line if len(one_line) <= max_len else one_line[:max_len] + "…"


def build_batch_extraction_prompt(
    start_group_idx: int,
    page_start: int,
    page_end: int,
    is_first_batch: bool,
    continuation: Optional[BatchContinuation],
) -> str:
    if is_first_batch or not continuation:
        continuity_hint = ""
    else:
        continuity_hint = (
            "\n## 衔接上批\n"
            f"- 末组：{continuation['last_group_id']}（{continuation['last_section'] or '未知'}），"
            f"末题：{continuation['last_question_number'] or '未知'}（{continuation['last_question_type'] or '未知'}）\n"
            f"- 末组 shared_stem 摘要：{_summarize(continuation['last_shared_stem_summary'])}\n"
            f"- 若本批第 1 题组是该题组延续小问：shared_stem=null、continues_previous=true、"
            f"section 同上批、group_id 仍从 G{start_group_idx}\n"
            "- 否则 continues_previous=false，正常输出\n"
        )

    title_hint = (
        "paper_title 与 paper_meta 必须填"
        if is_first_batch
        else "paper_title 与 paper_meta 设为 null"
    )

    return (
        f"你是试卷结构化抽取助手。本次抽取**第 {page_start} 至第 {page_end} 页**，按题组输出。\n\n"
        "- 每页之间用 `========= 第 N 页 =========` 分隔\n"
        "- 共享题干（阅读文章/解答题题干/文言文段落/表格题背景）放在 shared_stem，"
        "**不要重复抄到每题 stem**\n"
        f"- group_id 从 G{start_group_idx} 起连续\n"
        f"- {title_hint}\n"
        f"{continuity_hint}\n"
        f"{SCHEMA}\n"
        f"{EXAMPLES}\n"
        '若本批无完整题目则返回 `{"paper_title": null, "paper_meta": null, "groups": [], "warnings": []}`'
    )
