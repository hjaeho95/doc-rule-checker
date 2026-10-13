import { useMemo, useState } from 'react'
import { check } from '../checker'
import { DOC_TYPE_LABEL } from '../rules'
import { revisedOf, useStore } from '../store'
import { Button, Card, CardHeader, go, StatusBadge, useToast } from '../ui'
import { NoDraft } from './ResultPage'

export const REVIEWERS = ['검토자A', '검토자B']

export default function RequestPage() {
  const { state, submitRequest } = useStore()
  const toast = useToast()
  const [reviewer, setReviewer] = useState(REVIEWERS[0])
  const [memo, setMemo] = useState('')
  const draft = state.draft

  const final = useMemo(() => {
    if (!draft) return null
    const doc = revisedOf(draft, check(draft).violations)
    return { doc, result: check(doc) }
  }, [draft])

  if (!draft || !final) return <NoDraft />
  const { doc, result } = final

  const submit = () => {
    const req = submitRequest(reviewer, memo.trim())
    if (!req) return toast('필수 위반이 남아 있어 요청 불가')
    toast(`${reviewer}에게 검토 요청 알림 발송 (시연)`)
    go('inbox')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-lg font-bold text-slate-900">검토 요청</h1>
      <Card>
        <CardHeader title="요청 문서" right={<StatusBadge ok={result.canRequest} />} />
        <dl className="grid grid-cols-[88px_1fr] gap-y-2 p-4 text-sm">
          <dt className="text-slate-500">파일명</dt>
          <dd className="break-all font-mono">{doc.fileName}</dd>
          <dt className="text-slate-500">문서 종류</dt>
          <dd>{DOC_TYPE_LABEL[doc.docType]}</dd>
          <dt className="text-slate-500">점검 결과</dt>
          <dd>
            필수 {result.must}건 · 권고 잔여 {result.rec}건
            <span className="block text-xs text-slate-500">수락한 권고 수정안은 요청 시 본문에 반영</span>
          </dd>
        </dl>
      </Card>

      {result.canRequest ? (
        <Card className="space-y-4 p-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">검토자</span>
            <select
              value={reviewer}
              onChange={(e) => setReviewer(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 focus:border-brand-500 focus:outline-none"
            >
              {REVIEWERS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">요청 메모</span>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              placeholder="예: 결정 사항 이유 보완 여부 중점 검토 요청"
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => go('result')}>
              취소
            </Button>
            <Button onClick={submit}>검토 요청</Button>
          </div>
        </Card>
      ) : (
        <Card className="p-4 text-sm text-red-700">
          필수 위반 {result.must}건이 남아 있어 검토 요청 불가.{' '}
          <a href="#/result" className="underline">
            점검 결과로 이동
          </a>
        </Card>
      )}
    </div>
  )
}
