import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { applyFixes, check, type CheckInput, type Fix, type Violation } from './checker'
import type { DocType } from './rules'

export type Role = 'author' | 'reviewer'
export type Decision = 'accepted' | 'rejected'

export interface Draft extends CheckInput {
  /** 처음 점검한 원본. 수정본 미리보기 비교 기준 */
  original: { fileName: string; body: string }
  decisions: Record<string, Decision>
}

export interface ResidualItem {
  ruleId: string
  location: string
  message: string
  status: '작성자 거부' | '미조치' | '수락 (본문 미반영)'
}

export interface ReviewRequest {
  id: string
  docType: DocType
  fileName: string
  body: string
  requester: string
  reviewer: string
  memo: string
  requestedAt: string
  status: 'pending' | 'approved' | 'rejected'
  rejectReason?: string
  decidedAt?: string
  residual: ResidualItem[]
}

export interface RegistryDoc {
  id: string
  name: string
  docType: DocType
  approver: string
  approvedAt: string
}

interface AppState {
  role: Role
  draft: Draft | null
  requests: ReviewRequest[]
  registry: RegistryDoc[]
}

// 가상 등록 문서
const SEED_REGISTRY: RegistryDoc[] = [
  { id: 'seed-1', name: '가상레이더_인터페이스정의서_20260915.docx', docType: 'report', approver: '검토자A', approvedAt: '2026-09-16T14:20:00' },
  { id: 'seed-2', name: '가상레이더_주간회의록_20260929.md', docType: 'minutes', approver: '검토자B', approvedAt: '2026-09-29T17:05:00' },
  { id: 'seed-3', name: '가상레이더_전원시험절차서_20260930.md', docType: 'procedure', approver: '검토자A', approvedAt: '2026-10-01T09:40:00' },
]

const STORAGE_KEY = 'doc-rule-checker:v1'
const INITIAL: AppState = { role: 'author', draft: null, requests: [], registry: SEED_REGISTRY }

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...INITIAL, ...JSON.parse(raw) }
  } catch {
    // 저장소 접근 불가 시 초기 상태
  }
  return INITIAL
}

/** 수락된 권고의 수정 반영본 */
export function revisedOf(draft: Draft, violations: Violation[]): CheckInput {
  const fixes = violations.filter((v) => v.fix && draft.decisions[v.key] === 'accepted').map((v) => v.fix!) as Fix[]
  return applyFixes(draft, fixes)
}

export const now = () => new Date().toISOString()

function useAppState() {
  const [state, setState] = useState<AppState>(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // 무시
    }
  }, [state])

  const setRole = useCallback((role: Role) => setState((s) => ({ ...s, role })), [])

  const startCheck = useCallback(
    (input: CheckInput) =>
      setState((s) => ({
        ...s,
        draft: { ...input, original: { fileName: input.fileName, body: input.body }, decisions: {} },
      })),
    [],
  )

  const updateDraft = useCallback(
    (patch: Partial<Draft>) => setState((s) => (s.draft ? { ...s, draft: { ...s.draft, ...patch } } : s)),
    [],
  )

  const decide = useCallback(
    (key: string, d: Decision | null) =>
      setState((s) => {
        if (!s.draft) return s
        const decisions = { ...s.draft.decisions }
        if (d) decisions[key] = d
        else delete decisions[key]
        return { ...s, draft: { ...s.draft, decisions } }
      }),
    [],
  )

  const submitRequest = useCallback(
    (reviewer: string, memo: string): ReviewRequest | null => {
      const draft = state.draft
      if (!draft) return null
      const final = revisedOf(draft, check(draft).violations)
      const after = check(final)
      if (!after.canRequest) return null
      const residual: ResidualItem[] = after.violations.map((v) => ({
        ruleId: v.ruleId,
        location: v.location,
        message: v.message,
        status:
          draft.decisions[v.key] === 'rejected'
            ? '작성자 거부'
            : draft.decisions[v.key] === 'accepted'
              ? '수락 (본문 미반영)'
              : '미조치',
      }))
      const created: ReviewRequest = {
        id: `req-${Date.now()}`,
        docType: final.docType,
        fileName: final.fileName,
        body: final.body,
        requester: '작성자(나)',
        reviewer,
        memo,
        requestedAt: now(),
        status: 'pending',
        residual,
      }
      setState((s) => ({ ...s, requests: [created, ...s.requests], draft: null }))
      return created
    },
    [state.draft],
  )

  const approve = useCallback(
    (id: string, approver: string) =>
      setState((s) => {
        const req = s.requests.find((r) => r.id === id)
        if (!req || req.status !== 'pending') return s
        const at = now()
        return {
          ...s,
          requests: s.requests.map((r) => (r.id === id ? { ...r, status: 'approved', decidedAt: at } : r)),
          registry: [{ id: `doc-${id}`, name: req.fileName, docType: req.docType, approver, approvedAt: at }, ...s.registry],
        }
      }),
    [],
  )

  const reject = useCallback(
    (id: string, reason: string) =>
      setState((s) => ({
        ...s,
        requests: s.requests.map((r) =>
          r.id === id && r.status === 'pending' ? { ...r, status: 'rejected', rejectReason: reason, decidedAt: now() } : r,
        ),
      })),
    [],
  )

  const reset = useCallback(() => setState({ ...INITIAL, role: 'author' }), [])

  return { state, setRole, startCheck, updateDraft, decide, submitRequest, approve, reject, reset }
}

type Store = ReturnType<typeof useAppState>
const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useAppState()
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const s = useContext(StoreContext)
  if (!s) throw new Error('StoreProvider 누락')
  return s
}

export function formatTime(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
