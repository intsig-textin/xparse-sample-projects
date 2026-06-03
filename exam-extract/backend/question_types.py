# -*- coding: utf-8 -*-
"""题型常量单一来源 — prompt 与 backend 共享。新增题型只需改这里。"""

QUESTION_TYPES = [
    "单选题",
    "多选题",
    "判断题",
    "填空题",
    "默写题",
    "解答题",
    "计算题",
    "证明题",
    "阅读理解",
    "完形填空",
    "听力题",
    "翻译题",
    "简答题",
    "作文题",
    "综合题",
    "其他",
]

# prompt 中枚举给模型看的题型字符串（不含"其他"，"其他"作为兜底）
PROMPT_QUESTION_TYPE_LIST = "、".join(t for t in QUESTION_TYPES if t != "其他")
