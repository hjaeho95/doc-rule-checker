import { useState } from 'react'
import { splitLines } from '../checker'
import { DOC_TYPE_LABEL } from '../rules'
import { formatTime, useStore, type ReviewRequest } from '../store'
import { Button, Card, CardHeader, Empty, go, useToast } from '../ui'

const STATUS: Record<ReviewRequest['status'], { label: string; cls: string }> = {
  pending: { label: '검토 대기', cls: 'bg-amber-100 text-amber-800' },
  approved: { label: '승인', cls: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: '반려', cls: 'bg-red-100 text-red-800' },
}

function StatusChip({ status }: { status: ReviewRequest['status'] }) {
  const s = STATUS[status]
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>
}

export default function InboxPage() {
  const { state } = useStore()
  return state.role === 'reviewer' ? <ReviewerInbox /> : <AuthorRequests />
}

function ReviewerInbox() {
  const { state, approve, reject } = useStore()
  const toast = useToast()
  const sorted = [...state.requests].sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending'))
  const [selId, setSelId] = useState<string | null>(sorted[0]?.id ?? null)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const sel = state.requests.find((r) => r.id === selId) ?? null
  const pending = state.requests.filter((r) => r.status === 'pending').length

  const doApprove = () => {
    if (!sel) return
    approve(sel.id, sel.reviewer)
    toast(`승인 완료 — 문서목록에 등록: ${sel.fileName}`)
  }
  const doReject = () => {
    if (!sel || !reason.trim()) return
    reject(sel.id, reason.trim())
    setRejecting(false)
    setReason('')
    toast('반려 완료 — 작성자에게 반려 사유 전달 (시연)')
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-900">검토함</h1>
        <p className="text-sm text-slate-500">검토 대기 {pending}건 · 형식은 점검기가 확인 완료, 내용 검토에 집중</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <Card className="h-fit">
          <CardHeader title="요청 목록" />
          {sorted.length === 0 ? (
            <Empty>
              검토 요청 없음.
              <br />
              작성자로 전환해 샘플 문서를 점검·요청해 보세요.
            </Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sorted.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => {
                      setSelId(r.id)
                      setRejecting(false)
                    }}
                    className={`w-full px-4 py-3 text-left text-sm ${selId === r.id ? 'bg-brand-50' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="break-all font-mono text-[13px] font-medium text-slate-900">{r.fileName}</span>
                      <StatusChip status={r.status} />
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-500">
                      <span>{DOC_TYPE_LABEL[r.docType]}</span>
                      <span>요청자 {r.requester}</span>
                      <span>{formatTime(r.requestedAt)}</span>
                      <span className={r.residual.length ? 'text-amber-700' : ''}>권고 잔여 {r.residual.length}건</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {sel && (
          <Card className="min-w-0">
            <CardHeader title={<span className="break-all font-mono">{sel.fileName}</span>} right={<StatusChip status={sel.status} />} />
            <div className="space-y-4 p-4 text-sm">
              <dl className="grid grid-cols-[72px_1fr] gap-y-1 text-[13px]">
                <dt className="text-slate-500">요청자</dt>
                <dd>{sel.requester}</dd>
                <dt className="text-slate-500">검토자</dt>
                <dd>{sel.reviewer}</dd>
                <dt className="text-slate-500">요청 시각</dt>
                <dd>{formatTime(sel.requestedAt)}</dd>
                <dt className="text-slate-500">메모</dt>
                <dd>{sel.memo || '—'}</dd>
              </dl>

              <div>
                <div className="mb-1.5 text-xs font-semibold text-slate-700">점검 결과 요약 — 필수 0건 · 권고 잔여 {sel.residual.length}건</div>
                {sel.residual.length === 0 ? (
                  <p className="text-xs text-slate-500">잔여 권고 없음</p>
                ) : (
                  <ul className="space-y-1">
                    {sel.residual.map((x, i) => (
                      <li key={i} className="flex flex-wrap items-center gap-2 rounded bg-amber-50 px-2.5 py-1.5 text-xs">
                        <span className="font-mono font-semibold">{x.ruleId}</span>
                        <span className="text-slate-500">{x.location}</span>
                        <span>{x.message}</span>
                        <span
                          className={`ml-auto rounded px-1.5 py-0.5 font-medium ${x.status === '작성자 거부' ? 'bg-slate-700 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}
                        >
                          {x.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <div className="mb-1.5 text-xs font-semibold text-slate-700">본문</div>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded border border-slate-200 bg-slate-50 p-3 font-mono text-[13px] leading-6">
                  {splitLines(sel.body).join('\n')}
                </pre>
              </div>

              {sel.status === 'pending' ? (
                rejecting ? (
                  <div className="space-y-2 rounded border border-red-200 bg-red-50 p-3">
                    <label className="block text-xs font-medium text-red-800">반려 사유 (필수)</label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={2}
                      autoFocus
                      placeholder="예: 결정 사항 이유에 수치 근거 보완 필요"
                      className="w-full rounded-md border border-red-200 bg-white px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>
                        취소
                      </Button>
                      <Button size="sm" variant="danger" disabled={!reason.trim()} onClick={doReject}>
                        반려 확정
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end gap-2">
                    <Button variant="danger" onClick={() => setRejecting(true)}>
                      반려
                    </Button>
                    <Button variant="success" onClick={doApprove}>
                      승인
                    </Button>
                  </div>
                )
              ) : (
                <div className="rounded bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  {sel.status === 'approved' ? (
                    <>
                      {formatTime(sel.decidedAt!)} 승인 —{' '}
                      <a href="#/docs" className="text-brand-600 underline">
                        문서목록 등록됨
                      </a>
                    </>
                  ) : (
                    <>
                      {formatTime(sel.decidedAt!)} 반려 — 사유: {sel.rejectReason}
                    </>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

function AuthorRequests() {
  const { state, startCheck } = useStore()
  const toast = useToast()
  const mine = state.requests

  const reopen = (r: ReviewRequest) => {
    startCheck({ docType: r.docType, fileName: r.fileName, body: r.body })
    toast('반려 문서를 다시 불러옴 — 사유 반영 후 재요청')
    go('result')
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-900">내 검토 요청</h1>
        <p className="text-sm text-slate-500">
          승인·반려 처리는 상단에서 <b>검토자</b>로 전환해 확인
        </p>
      </div>
      <Card>
        {mine.length === 0 ? (
          <Empty>
            보낸 검토 요청 없음.{' '}
            <a href="#/check" className="text-brand-600 underline">
              문서 점검
            </a>
            부터 시작하세요.
          </Empty>
        ) : (
          <ul className="divide-y divide-slate-100">
            {mine.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <div className="break-all font-mono text-[13px] font-medium">{r.fileName}</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {DOC_TYPE_LABEL[r.docType]} · {r.reviewer} · {formatTime(r.requestedAt)}
                  </div>
                  {r.status === 'rejected' && (
                    <div className="mt-1.5 rounded bg-red-50 px-2.5 py-1.5 text-xs text-red-800">반려 사유: {r.rejectReason}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <StatusChip status={r.status} />
                  {r.status === 'rejected' && (
                    <Button size="sm" variant="secondary" onClick={() => reopen(r)}>
                      다시 점검
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
