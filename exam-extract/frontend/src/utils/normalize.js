export function flattenQuestions(groups) {
  const out = []
  for (const g of groups) out.push(...g.questions)
  return out
}

export function countByType(groups) {
  const counts = {}
  for (const g of groups) {
    for (const q of g.questions) {
      counts[q.type] = (counts[q.type] ?? 0) + 1
    }
  }
  return counts
}

export function totalScore(groups) {
  const all = flattenQuestions(groups)
  if (!all.length) return null
  if (all.every((q) => q.score === null || q.score === undefined)) return null
  return all.reduce((sum, q) => sum + (q.score ?? 0), 0)
}

export function totalQuestionCount(groups) {
  let n = 0
  for (const g of groups) n += g.questions.length
  return n
}
