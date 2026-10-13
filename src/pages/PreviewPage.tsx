import { useMemo } from 'react'
import { check, diffLines, splitLines } from '../checker'
import { revisedOf, useStore } from '../store'
import { Button, Card, CardHeader, go, useToast } from '../ui'
import { NoDraft } from './ResultPage'

export default function PreviewPage() {
  const { state, updateDraft } = useStore()
  const toast = useToast()
  const draft = state.draft

  const data = useMemo(() => {
    if (!draft) return null
    const result = check(draft)
    const revised = revisedOf(draft, result.violations)
    const ops = diffLines(splitLines(draft.original.body), splitLines(revised.body))
    const pending = result.violations.filter((v) => v.fix && draft.decisions[v.key] === 'accepted').length
    return { revised, ops, pending }
  }, [draft])

  if (!draft || !data) return <NoDraft />
  const { revised, ops, pending } = data
  const nameChanged = draft.original.fileName !== revised.fileName
  const changed = ops.filter((o) => o.type !== 'same').length

  const download = () => {
    const blob = new Blob([`파일명: ${revised.fileName}\n\n${revised.body}\n`], { type: 'text/plain;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${revised.fileName.replace(/\.[^.]+$/, '') || '수정본'}.txt`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const recheck = () => {
    updateDraft({ fileName: revised.fileName, body: revised.body, decisions: {} })
    const after = check(revised)
    toast(`수정본 재점검: 필수 ${after.must}건 / 권고 ${after.rec}건`)
    go('result')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">수정본 미리보기</h1>
          <p className="text-sm text-slate-500">
            처음 점검한 원본 대비 변경 {changed}줄 · 반영 대기 중인 수락 항목 {pending}건 (적용 항목은 이미 본문 반영)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => go('result')}>
            ← 결과로
          </Button>
          <Button variant="secondary" onClick={download}>
            텍스트 다운로드
          </Button>
          <Button onClick={recheck}>수정본으로 재점검</Button>
        </div>
      </div>

      <Card>
        <CardHeader
          title="변경 비교"
          right={
            <span className="flex gap-3 text-xs">
              <span className="text-red-700 line-through">삭제</span>
              <span className="rounded bg-emerald-100 px-1 text-emerald-800">추가</span>
            </span>
          }
        />
        <div className="overflow-x-auto py-2 font-mono text-[13px] leading-6">
          <div className="px-3 pb-1 text-xs text-slate-500">파일명</div>
          {nameChanged ? (
            <>
              <DiffRow type="del" text={draft.original.fileName} />
              <DiffRow type="add" text={revised.fileName} />
            </>
          ) : (
            <DiffRow type="same" text={revised.fileName} />
          )}
          <div className="my-1 border-t border-dashed border-slate-200" />
          {ops.map((o, i) => (
            <DiffRow key={i} type={o.type} text={o.text} />
          ))}
        </div>
      </Card>
    </div>
  )
}

function DiffRow({ type, text }: { type: 'same' | 'add' | 'del'; text: string }) {
  const cls =
    type === 'add' ? 'bg-emerald-50 text-emerald-900' : type === 'del' ? 'bg-red-50 text-red-700 line-through decoration-red-400' : ''
  const mark = type === 'add' ? '+' : type === 'del' ? '−' : ' '
  return (
    <div className={`flex gap-3 px-3 ${cls}`}>
      <span className="w-4 shrink-0 select-none text-center text-slate-400">{mark}</span>
      <span className="whitespace-pre-wrap break-all">{text || ' '}</span>
    </div>
  )
}
