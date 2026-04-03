import {
  Document, Packer, Paragraph, TextRun,
  HeadingLevel, AlignmentType,
} from 'docx'

export async function exportReportAsWord({ fileName, parties, clauseData, normData }) {
  const dateStr = new Date().toLocaleDateString('zh-CN')
  const clauseCategories = ['责任条款', '违约条款', '知识产权', '保密条款', '争议解决']
  const normCategories   = ['错漏', '一致性', '格式', '修订']

  const children = []

  // ── Title ──
  children.push(
    new Paragraph({
      text: '合同审查报告',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: `文件：${fileName}`, color: '666666', size: 20 })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: `审查日期：${dateStr}`, color: '666666', size: 20 })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ text: '' }),
  )

  // ── Parties ──
  children.push(new Paragraph({ text: '一、主体信息', heading: HeadingLevel.HEADING_2 }))
  if (parties?.party_a) {
    children.push(new Paragraph({
      children: [new TextRun({ text: `甲方：${parties.party_a.name || '未识别'}` })],
    }))
  }
  if (parties?.party_b) {
    children.push(new Paragraph({
      children: [new TextRun({ text: `乙方：${parties.party_b.name || '未识别'}` })],
    }))
  }
  children.push(new Paragraph({ text: '' }))

  // ── Clause Review ──
  children.push(new Paragraph({ text: '二、条款审阅', heading: HeadingLevel.HEADING_2 }))
  clauseCategories.forEach(catKey => {
    const items = clauseData?.[catKey] || []
    children.push(new Paragraph({ text: catKey, heading: HeadingLevel.HEADING_3 }))
    if (items.length === 0) {
      children.push(new Paragraph({
        children: [new TextRun({ text: '未发现问题', color: '888888', italics: true })],
      }))
    } else {
      items.forEach((item, i) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `${i + 1}. [${item.issue_type}] ${item.description}`, bold: true })],
          }),
        )
        if (item.original_text) {
          children.push(new Paragraph({
            children: [new TextRun({ text: `原文："${item.original_text}"`, color: '856404', italics: true })],
          }))
        }
        if (item.suggestion) {
          children.push(new Paragraph({
            children: [new TextRun({ text: `建议：${item.suggestion}`, color: '145A32' })],
          }))
        }
        children.push(new Paragraph({ text: '' }))
      })
    }
  })

  // ── Norm Review ──
  children.push(new Paragraph({ text: '三、规范审阅', heading: HeadingLevel.HEADING_2 }))
  normCategories.forEach(catKey => {
    const items = normData?.[catKey] || []
    children.push(new Paragraph({ text: catKey, heading: HeadingLevel.HEADING_3 }))
    if (items.length === 0) {
      children.push(new Paragraph({
        children: [new TextRun({ text: '未发现问题', color: '888888', italics: true })],
      }))
    } else {
      items.forEach((item, i) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `${i + 1}. [${item.severity || '中'}] ${item.description}`, bold: true })],
          }),
        )
        if (item.original_text) {
          children.push(new Paragraph({
            children: [new TextRun({ text: `原文："${item.original_text}"`, color: '856404', italics: true })],
          }))
        }
        if (item.suggestion) {
          children.push(new Paragraph({
            children: [new TextRun({ text: `建议：${item.suggestion}`, color: '145A32' })],
          }))
        }
        children.push(new Paragraph({ text: '' }))
      })
    }
  })

  const doc = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `合同审查报告_${fileName}_${dateStr}.docx`
  a.click()
  URL.revokeObjectURL(url)
}
