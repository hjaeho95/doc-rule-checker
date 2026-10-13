import type { DocType } from './rules'

export type Severity = '필수' | '권고'
export type Judge = '코드' | 'AI 시연'

export type Fix =
  | { kind: 'fileName'; value: string }
  | { kind: 'replaceLine'; lineText: string; with: string[] }
  | { kind: 'deleteLine'; lineText: string }
  | { kind: 'append'; text: string }

export interface Violation {
  /** 재점검 후에도 유지되는 식별자 (규칙 + 대상 줄 텍스트) */
  key: string
  ruleId: string
  /** 1부터 시작하는 본문 줄 번호. 파일명·문서 전체 대상이면 null */
  line: number | null
  location: string
  message: string
  suggestion: string
  severity: Severity
  judge: Judge
  fix?: Fix
}

export interface CheckInput {
  docType: DocType
  fileName: string
  body: string
}

export interface CheckResult {
  violations: Violation[]
  must: number
  rec: number
  canRequest: boolean
}

interface Section {
  title: string
  headerLine: number // 0-based
  lines: { idx: number; text: string }[]
}

const SECTION_RE = /^(\d+)\.\s*(\S.*)$/
const WRITTEN_RE = /^작성일:\s*(\d{4}-\d{2}-\d{2})?/

export function splitLines(body: string): string[] {
  return body.replace(/\r\n/g, '\n').split('\n')
}

export function parseSections(lines: string[]): Section[] {
  const sections: Section[] = []
  let cur: Section | null = null
  lines.forEach((raw, idx) => {
    const text = raw.trim()
    const m = text.match(SECTION_RE)
    if (m) {
      cur = { title: m[2].trim(), headerLine: idx, lines: [] }
      sections.push(cur)
    } else if (cur && text) {
      cur.lines.push({ idx, text })
    }
  })
  return sections
}

export function findWrittenDate(lines: string[]): string | null {
  for (const raw of lines.slice(0, 5)) {
    const m = raw.trim().match(WRITTEN_RE)
    if (m) return m[1] ?? null
  }
  return null
}

/** 파일명에서 yyyyMMdd / yyyy.MM.dd / yyyy-MM-dd 날짜 추출 → yyyyMMdd */
export function extractFileDate(fileName: string): { raw: string; ymd: string } | null {
  const m = fileName.match(/(\d{4})([.-]?)(\d{2})\2(\d{2})/)
  if (!m) return null
  return { raw: m[0], ymd: `${m[1]}${m[3]}${m[4]}` }
}

function suggestFileName(fileName: string, ymd: string | null): string | null {
  if (!ymd) return null
  const extMatch = fileName.match(/\.(docx|md|txt)$/i)
  const ext = extMatch ? extMatch[1].toLowerCase() : 'docx'
  let stem = extMatch ? fileName.slice(0, -extMatch[0].length) : fileName
  const date = extractFileDate(stem)
  if (date) stem = stem.replace(date.raw, ymd)
  else stem = `${stem.replace(/_+$/, '')}_${ymd}`
  return `${stem}.${ext}`
}

// C-03 샘플 문장 사전 정의 수정안 (명세서 5.1)
const C03_PRESET: Record<string, string> = {
  '시험 중 통신이 끊기는 현상이 발생하여 원인을 분석하였습니다.': '시험 중 통신 두절 현상 발생, 원인 분석 수행',
}
const C04_PRESET: Record<string, string[]> = {
  'SBC 재부팅 후 정상 동작을 확인하였고 로그는 서버에 업로드함': ['SBC 재부팅 후 정상 동작 확인', '로그 서버 업로드 완료'],
}

const C03_RE = /(습니다|하였다|했다|한다|된다|바랍니다|입니다)\.?$/
const C03_ENDINGS: [RegExp, string][] = [
  [/하였습니다\.?$/, '함'],
  [/했습니다\.?$/, '함'],
  [/되었습니다\.?$/, '됨'],
  [/됐습니다\.?$/, '됨'],
  [/합니다\.?$/, '함'],
  [/됩니다\.?$/, '됨'],
  [/입니다\.?$/, '임'],
  [/바랍니다\.?$/, '바람'],
  [/하였다\.?$/, '함'],
  [/했다\.?$/, '함'],
  [/한다\.?$/, '함'],
  [/된다\.?$/, '됨'],
]

const C04_RE = /(하였고|했고|되었고|이며|하며)/
const C04_END: Record<string, string> = { 하였고: '함', 했고: '함', 되었고: '됨', 이며: '임', 하며: '함' }

const C06_WEAK = /(협의 결과|논의 결과|회의 결과|검토 결과)/
const P02_KEYWORDS = /(손상|오동작|유실|금지|화재|감전|파손|오결선|사고|위험)/
const STEP_RE = /^(\d+)([).])\s*/

function field(text: string, name: string): string | null {
  const m = text.match(new RegExp(`${name}:\\s*([^/]*)`))
  if (!m) return null
  return m[1].trim()
}

export function check(input: CheckInput): CheckResult {
  const { docType, fileName } = input
  const lines = splitLines(input.body)
  const sections = parseSections(lines)
  const written = findWrittenDate(lines)
  const writtenYmd = written ? written.replace(/-/g, '') : null
  const v: Violation[] = []

  const loc = (idx: number) => {
    const sec = [...sections].reverse().find((s) => s.headerLine <= idx)
    const secLabel = sec ? `${lines[sec.headerLine].trim()}` : '머리말'
    return `${secLabel} · ${idx + 1}행`
  }

  // C-01 파일명 형식
  const nameFix = suggestFileName(fileName.trim(), writtenYmd)
  if (!/^[^_]+_[^_]+_\d{8}\.(docx|md|txt)$/.test(fileName.trim())) {
    v.push({
      key: 'C-01|file',
      ruleId: 'C-01',
      line: null,
      location: '파일명',
      message: `파일명 "${fileName.trim() || '(없음)'}" 형식 불일치`,
      suggestion: nameFix ? nameFix : '[프로젝트]_[문서명]_[yyyyMMdd].확장자 형식으로 수정',
      severity: '필수',
      judge: '코드',
      fix: nameFix ? { kind: 'fileName', value: nameFix } : undefined,
    })
  }

  // C-02 파일명 날짜 = 작성일
  const fileDate = extractFileDate(fileName)
  if (!written) {
    v.push({
      key: 'C-02|file',
      ruleId: 'C-02',
      line: null,
      location: '머리말',
      message: '본문에 "작성일: YYYY-MM-DD" 없음',
      suggestion: '첫 줄에 "작성일: YYYY-MM-DD" 기재',
      severity: '필수',
      judge: '코드',
    })
  } else if (!fileDate || fileDate.ymd !== writtenYmd) {
    v.push({
      key: 'C-02|file',
      ruleId: 'C-02',
      line: null,
      location: '파일명',
      message: fileDate
        ? `파일명 날짜 ${fileDate.raw} ≠ 작성일 ${written}`
        : `파일명에 날짜 없음 (작성일 ${written})`,
      suggestion: nameFix ?? `파일명 날짜를 ${writtenYmd}로 수정`,
      severity: '필수',
      judge: '코드',
      fix: nameFix ? { kind: 'fileName', value: nameFix } : undefined,
    })
  }

  // C-03, C-04: 설명부 각 줄 (AI 판정 시연 — 패턴 기반 모의)
  sections.forEach((sec) =>
    sec.lines.forEach(({ idx, text }) => {
      if (C03_RE.test(text)) {
        const preset = C03_PRESET[text]
        const ending = C03_ENDINGS.find(([re]) => re.test(text))
        const fixed = preset ?? (ending ? text.replace(ending[0], ending[1]) : null)
        v.push({
          key: `C-03|${text}`,
          ruleId: 'C-03',
          line: idx + 1,
          location: loc(idx),
          message: '서술형 종결 — 개조식(명사형 종결) 아님',
          suggestion: fixed ?? '명사형 종결로 수정 (예: ~발생, ~수행, ~확인)',
          severity: '권고',
          judge: 'AI 시연',
          fix: fixed ? { kind: 'replaceLine', lineText: text, with: [fixed] } : undefined,
        })
      }
      const m4 = text.match(C04_RE)
      if (m4) {
        const preset = C04_PRESET[text]
        const at = m4.index!
        const split = preset ?? [
          `${text.slice(0, at)}${C04_END[m4[1]]}`.trim(),
          text.slice(at + m4[1].length).trim(),
        ]
        v.push({
          key: `C-04|${text}`,
          ruleId: 'C-04',
          line: idx + 1,
          location: loc(idx),
          message: `"${m4[1]}"로 두 내용 연결 — 한 문장 한 내용 아님`,
          suggestion: split.join(' / '),
          severity: '권고',
          judge: 'AI 시연',
          fix: { kind: 'replaceLine', lineText: text, with: split },
        })
      }
    }),
  )

  // C-05 마지막 절 문서 이력
  const last = sections[sections.length - 1]
  if (!last || last.title !== '문서 이력') {
    const nextNo = sections.length + 1
    const template = `${nextNo}. 문서 이력\nv1.0 / ${written ?? 'YYYY-MM-DD'} / 최초 작성`
    v.push({
      key: 'C-05|doc',
      ruleId: 'C-05',
      line: null,
      location: '문서 끝',
      message: last ? `마지막 절 "${last.title}" — "문서 이력" 아님` : '절 구조 없음 — "문서 이력" 절 없음',
      suggestion: template.replace('\n', ' + '),
      severity: '필수',
      judge: '코드',
      fix: { kind: 'append', text: template },
    })
  }

  // C-06 결정 사항 이유
  sections
    .filter((s) => s.title === '결정 사항')
    .forEach((sec) =>
      sec.lines.forEach(({ idx, text }) => {
        const reason = field(text, '이유')
        if (!reason) {
          v.push({
            key: `C-06|${text}`,
            ruleId: 'C-06',
            line: idx + 1,
            location: loc(idx),
            message: '결정 이유 누락',
            suggestion: '"/ 이유: …" 추가 — 결정을 뒤집으려는 사람을 막는 근거 기재 필요 (작성자 직접 입력)',
            severity: '필수',
            judge: '코드',
          })
        } else if (C06_WEAK.test(reason) || reason.replace(/\s/g, '').length < 6) {
          v.push({
            key: `C-06|${text}`,
            ruleId: 'C-06',
            line: idx + 1,
            location: loc(idx),
            message: `이유 "${reason}" — 결정 근거로 불충분`,
            suggestion: '결정을 뒤집으려는 사람을 막는 근거 기재 필요 (수치·제약·대안 비교 등, 작성자 직접 입력)',
            severity: '권고',
            judge: 'AI 시연',
          })
        }
      }),
    )

  // M-01 Action Item 담당·기한
  if (docType === 'minutes') {
    sections
      .filter((s) => s.title.toLowerCase() === 'action item')
      .forEach((sec) =>
        sec.lines.forEach(({ idx, text }) => {
          const owner = field(text, '담당')
          const due = field(text, '기한')
          const missing = [!owner && '담당', !due && '기한'].filter(Boolean)
          if (missing.length) {
            v.push({
              key: `M-01|${text}`,
              ruleId: 'M-01',
              line: idx + 1,
              location: loc(idx),
              message: `${missing.join('·')} 누락`,
              suggestion: `"/ ${missing.map((f) => `${f}: …`).join(' / ')}" 추가 (기한은 예: 2026-10-13)`,
              severity: '필수',
              judge: '코드',
            })
          } else if (!/^\d{4}-\d{2}-\d{2}$/.test(due!)) {
            v.push({
              key: `M-01|${text}`,
              ruleId: 'M-01',
              line: idx + 1,
              location: loc(idx),
              message: `기한 "${due}" — 구체 날짜 아님`,
              suggestion: '구체 날짜 기재 (예: 2026-10-13)',
              severity: '권고',
              judge: 'AI 시연',
            })
          }
        }),
      )
  }

  if (docType === 'procedure') {
    // P-01 수행 단계 번호
    sections
      .filter((s) => s.title === '수행 절차')
      .forEach((sec) =>
        sec.lines.forEach(({ idx, text }, i) => {
          if (STEP_RE.test(text)) return
          const prev = sec.lines.slice(0, i).reverse().find((l) => STEP_RE.test(l.text))
          const next = sec.lines.slice(i + 1).find((l) => STEP_RE.test(l.text))
          const pm = prev?.text.match(STEP_RE)
          const nm = next?.text.match(STEP_RE)
          const no = pm ? Number(pm[1]) + 1 : nm ? Math.max(1, Number(nm[1]) - 1) : i + 1
          const delim = pm?.[2] ?? nm?.[2] ?? ')'
          const fixed = `${no}${delim} ${text}`
          v.push({
            key: `P-01|${text}`,
            ruleId: 'P-01',
            line: idx + 1,
            location: loc(idx),
            message: '단계 번호 없음',
            suggestion: fixed,
            severity: '필수',
            judge: '코드',
            fix: { kind: 'replaceLine', lineText: text, with: [fixed] },
          })
        }),
      )

    // P-02 주의사항은 사고 유발 사항만
    sections
      .filter((s) => s.title === '주의사항')
      .forEach((sec) =>
        sec.lines.forEach(({ idx, text }) => {
          if (P02_KEYWORDS.test(text)) return
          v.push({
            key: `P-02|${text}`,
            ruleId: 'P-02',
            line: idx + 1,
            location: loc(idx),
            message: '사고 유발 사항으로 보기 어려움',
            suggestion: '사고 무관 항목 삭제 검토',
            severity: '권고',
            judge: 'AI 시연',
            fix: { kind: 'deleteLine', lineText: text },
          })
        }),
      )
  }

  v.sort((a, b) => (a.line ?? (a.location === '문서 끝' ? 1e9 : -1)) - (b.line ?? (b.location === '문서 끝' ? 1e9 : -1)))
  const must = v.filter((x) => x.severity === '필수').length
  const rec = v.length - must
  return { violations: v, must, rec, canRequest: must === 0 }
}

export function applyFixes(input: CheckInput, fixes: Fix[]): CheckInput {
  let fileName = input.fileName
  let lines = splitLines(input.body)
  for (const f of fixes) {
    if (f.kind === 'fileName') fileName = f.value
    else if (f.kind === 'append') {
      while (lines.length && !lines[lines.length - 1].trim()) lines.pop()
      lines = [...lines, ...f.text.split('\n')]
    } else {
      const i = lines.findIndex((l) => l.trim() === f.lineText)
      if (i < 0) continue
      lines = [...lines.slice(0, i), ...(f.kind === 'replaceLine' ? f.with : []), ...lines.slice(i + 1)]
    }
  }
  return { ...input, fileName, body: lines.join('\n') }
}

export type DiffOp = { type: 'same' | 'add' | 'del'; text: string }

/** 줄 단위 LCS 비교 */
export function diffLines(a: string[], b: string[]): DiffOp[] {
  const n = a.length
  const m = b.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const out: DiffOp[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: 'same', text: a[i] })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) out.push({ type: 'del', text: a[i++] })
    else out.push({ type: 'add', text: b[j++] })
  }
  while (i < n) out.push({ type: 'del', text: a[i++] })
  while (j < m) out.push({ type: 'add', text: b[j++] })
  return out
}
