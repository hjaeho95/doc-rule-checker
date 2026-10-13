import { describe, expect, it } from 'vitest'
import { applyFixes, check, type Fix } from './checker'
import { SAMPLES } from './samples'

const sample = (t: string) => SAMPLES.find((s) => s.docType === t)!

describe('샘플 기대 건수 (명세서 5절)', () => {
  it('시험결과보고서: 필수 3 / 권고 3', () => {
    const r = check(sample('report'))
    expect(r.violations.filter((v) => v.severity === '필수').map((v) => v.ruleId).sort()).toEqual(['C-01', 'C-02', 'C-05'])
    expect(r.violations.filter((v) => v.severity === '권고').map((v) => v.ruleId).sort()).toEqual(['C-03', 'C-04', 'C-06'])
    expect(r.canRequest).toBe(false)
  })
  it('회의록: 필수 0 / 권고 1 (M-01)', () => {
    const r = check(sample('minutes'))
    expect([r.must, r.rec]).toEqual([0, 1])
    expect(r.violations[0].ruleId).toBe('M-01')
    expect(r.canRequest).toBe(true)
  })
  it('절차서: 필수 1 (P-01) / 권고 1 (P-02)', () => {
    const r = check(sample('procedure'))
    expect(r.violations.map((v) => `${v.ruleId}:${v.severity}`).sort()).toEqual(['P-01:필수', 'P-02:권고'])
    expect(r.violations.find((v) => v.ruleId === 'P-01')!.suggestion).toBe('2) 시험 프로그램 실행')
  })
})

describe('수정 흐름 (명세서 6절)', () => {
  it('파일명만 고쳐도 C-01·C-02 즉시 해소', () => {
    const r = check({ ...sample('report'), fileName: '가상레이더_시험결과보고서_20261006.docx' })
    expect(r.violations.some((v) => v.ruleId === 'C-01' || v.ruleId === 'C-02')).toBe(false)
  })
  it('보고서 자동 적용(C-01, C-05) → 필수 0건', () => {
    const doc = sample('report')
    const r = check(doc)
    const fixes = r.violations.filter((v) => v.severity === '필수' && v.fix).map((v) => v.fix!) as Fix[]
    const fixed = applyFixes(doc, fixes)
    expect(fixed.fileName).toBe('가상레이더_시험결과보고서_20261006.docx')
    const r2 = check(fixed)
    expect(r2.must).toBe(0)
    expect(r2.canRequest).toBe(true)
  })
  it('권고 수락 반영 → C-03·C-04 해소', () => {
    const doc = sample('report')
    const r = check(doc)
    const fixes = r.violations.filter((v) => v.fix).map((v) => v.fix!)
    const r2 = check(applyFixes(doc, fixes))
    expect(r2.violations.map((v) => v.ruleId)).toEqual(['C-06'])
  })
  it('결정 이유 누락은 필수', () => {
    const doc = sample('minutes')
    const r = check({ ...doc, body: doc.body.replace(' / 이유: 타 장비 응답 지연 최대 420ms', '') })
    expect(r.violations.find((v) => v.ruleId === 'C-06')!.severity).toBe('필수')
  })
})

describe('규칙 질의 (명세서 3.8)', async () => {
  const { answer, EXAMPLE_QUESTIONS } = await import('./qa')
  it('예시 질문 → 관련 규칙', () => {
    expect(EXAMPLE_QUESTIONS.map((q) => answer(q).rules[0]?.id)).toEqual(['C-02', 'C-06', 'P-02'])
  })
})
