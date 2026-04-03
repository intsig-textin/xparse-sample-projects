export type ModuleKey =
  | 'basic'
  | 'qualification'
  | 'evaluation'
  | 'submission'
  | 'invalid_risk'
  | 'annex';

export const TENDER_MODULES = [
  { key: 'basic', name: '基础信息' },
  { key: 'qualification', name: '资格要求' },
  { key: 'evaluation', name: '评审要求' },
  { key: 'submission', name: '投标要求' },
  { key: 'invalid_risk', name: '无效标风险' },
  { key: 'annex', name: '附件材料' }
] as const;

export const MODULE_SECTIONS: Record<ModuleKey, { key: string; title: string }[]> = {
  basic: [
    { key: 'bidder_agency', title: '招标人/代理信息' },
    { key: 'project_info', title: '项目信息' },
    { key: 'key_time_content', title: '关键时间/内容' },
    { key: 'bid_bond_related', title: '保证金相关' },
    { key: 'other_info', title: '其他信息' },
    { key: 'procurement_requirements', title: '采购要求' }
  ],
  qualification: [
    { key: 'applicant_requirements', title: '申请人资格要求' },
    { key: 'eligibility_review', title: '资格性审查' },
    { key: 'compliance_review', title: '符合性审查' }
  ],
  evaluation: [
    { key: 'scoring_criteria', title: '评分标准' },
    { key: 'bid_opening', title: '开标' },
    { key: 'bid_evaluation', title: '评标' },
    { key: 'contract_award', title: '合同授予' }
  ],
  submission: [
    { key: 'bid_document', title: '投标文件' },
    { key: 'bidding', title: '投标' }
  ],
  invalid_risk: [
    { key: 'discarded_items', title: '废标项' },
    { key: 'forbidden_situations', title: '不得存在的情形' },
    { key: 'rejection_invalid_bid', title: '否决和无效投标情形' }
  ],
  annex: [
    { key: 'required_documents', title: '证明材料' }
  ]
};
