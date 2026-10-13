import { useEffect, useMemo, useState } from 'react'
import { applyFixes, check, splitLines, type Violation } from '../checker'
import { DOC_TYPE_LABEL, RULE_BY_ID } from '../rules'
import { useStore } from '../store'
import { Button, Card, CardHeader, Empty, go, JudgeBadge, SeverityBadge, StatusBadge, useToast } from '../ui'

export function NoDraft() {
  return (
    <Card>
      <Empty>
        점검 중인 문서가 없습니다.{' '}
        <a href="#/check" className="text-brand-600 underline">
          점검 입력
        </a>
        에서 문서를 입력하세요.
      </Empty>
    </Card>
  )
}

export default function ResultPage() {
  const { state, updateDraft, decide } = useStore()
  const toast = useToast()
  const draft = state.draft
  const result = useMemo(() => (draft ? check(draft) : null), [draft])
  const [selected, setSelected] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editBody, setEditBody] = useState('')

  useEffect(() => {
    if (result && !result.violations.some((v) => v.key === selected)) setSelected(result.violations[0]?.key ?? null)
  }, [result, selected])

  if (!draft || !result) return <NoDraft />

  const sel = result.violations.find((v) => v.key === selected) ?? null
  const lines = splitLines(draft.body)
  const lineSeverity = new Map<number, string>()
  result.violations.forEach((v) => {
    if (v.line && lineSeverity.get(v.line) !== '필수') lineSeverity.set(v.line, v.severity)
  })
  const fileViolation = result.violations.find((v) => v.location === '파일명')
  const accepted = result.violations.filter((v) => draft.decisions[v.key] === 'accepted').length
  const rejectedCnt = result.violations.filter((v) => draft.decisions[v.key] === 'rejected').length

  const focus = (v: Violation) => {
    setSelected(v.key)
    const id = v.line ? `line-${v.line}` : v.location === '파일명' ? 'line-file' : v.location === '머리말' ? 'line-1' : 'line-end'
    document.getElementById(id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  const applyNow = (v: Violation) => {
    const next = applyFixes(draft, [v.fix!])
    updateDraft({ fileName: next.fileName, body: next.body })
    const after = check({ ...draft, ...next })
    toast(`${v.ruleId} 수정 적용 → 재점검: 필수 ${after.must}건 / 권고 ${after.rec}건`)
  }

  const startEdit = (v?: Violation) => {
    setEditName(draft.fileName)
    setEditBody(draft.body)
    setEditing(true)
    if (v) setSelected(v.key)
  }

  const recheck = () => {
    updateDraft({ fileName: editName.trim(), body: editBody })
    setEditing(false)
    const after = check({ ...draft, fileName: editName.trim(), body: editBody })
    toast(`재점검 완료: 필수 ${after.must}건 / 권고 ${after.rec}건`)
  }

  return (
    <div className="space-y-5">
      {/* 요약 */}
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge ok={result.canRequest} large />
              <span className="text-xs text-slate-500">{DOC_TYPE_LABEL[draft.docType]}</span>
            </div>
            <div className="mt-2 break-all font-mono text-sm text-slate-800">{draft.fileName || '(파일명 없음)'}</div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <span>
                필수 <b className="text-lg text-red-700">{result.must}</b>건
              </span>
              <span>
                권고 <b className="text-lg text-amber-700">{result.rec}</b>건
              </span>
              {(accepted > 0 || rejectedCnt > 0) && (
                <span className="text-slate-500">
                  (수락 {accepted} · 거부 {rejectedCnt})
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={() => go('check')}>
                ← 입력으로
              </Button>
              <Button variant="secondary" onClick={() => go('preview')}>
                수정본 미리보기
              </Button>
              <span title={result.canRequest ? '' : `필수 위반 ${result.must}건 해소 후 요청 가능`}>
                <Button disabled={!result.canRequest} onClick={() => go('request')}>
                  검토 요청
                </Button>
              </span>
            </div>
            {!result.canRequest && (
              <span className="text-xs text-red-700">필수 위반 {result.must}건 해소 후 검토 요청 가능</span>
            )}
          </div>
        </div>
      </Card>

      {/* 위반 목록 */}
      <Card>
        <CardHeader
          title={`위반 목록 (${result.violations.length})`}
          right={<span className="text-xs text-slate-500">행 클릭 → 원문 위치·근거 조항 표시</span>}
        />
        {result.violations.length === 0 ? (
          <Empty>위반 없음 — 모든 규칙 충족</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">위치</th>
                  <th className="px-3 py-2 font-medium">규칙</th>
                  <th className="px-3 py-2 font-medium">위반 내용</th>
                  <th className="px-3 py-2 font-medium">수정안</th>
                  <th className="px-3 py-2 font-medium">심각도</th>
                  <th className="px-3 py-2 font-medium">판정 주체</th>
                  <th className="px-3 py-2 font-medium">조치</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.violations.map((v) => {
                  const d = draft.decisions[v.key]
                  return (
                    <tr
                      key={v.key}
                      onClick={() => focus(v)}
                      className={`cursor-pointer align-top ${selected === v.key ? 'bg-brand-50' : 'hover:bg-slate-50'} ${d === 'rejected' ? 'text-slate-400' : ''}`}
                    >
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-600">{v.location}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs font-semibold">{v.ruleId}</td>
                      <td className="px-3 py-2.5">{v.message}</td>
                      <td className="px-3 py-2.5 text-slate-700">
                        <span className="break-all">{v.suggestion}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <SeverityBadge severity={v.severity} />
                      </td>
                      <td className="px-3 py-2.5">
                        <JudgeBadge judge={v.judge} />
                      </td>
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        {v.severity === '필수' ? (
                          v.fix ? (
                            <Button size="sm" onClick={() => applyNow(v)}>
                              적용
                            </Button>
                          ) : (
                            <Button size="sm" variant="secondary" onClick={() => startEdit(v)}>
                              직접 수정
                            </Button>
                          )
                        ) : (
                          <div className="flex flex-col items-start gap-1">
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant={d === 'accepted' ? 'success' : 'secondary'}
                                onClick={() => decide(v.key, d === 'accepted' ? null : 'accepted')}
                              >
                                {d === 'accepted' ? '수락됨' : '수락'}
                              </Button>
                              <Button
                                size="sm"
                                variant={d === 'rejected' ? 'primary' : 'secondary'}
                                className={d === 'rejected' ? '!bg-slate-500' : ''}
                                onClick={() => decide(v.key, d === 'rejected' ? null : 'rejected')}
                              >
                                {d === 'rejected' ? '거부됨' : '거부'}
                              </Button>
                            </div>
                            {d === 'accepted' && !v.fix && (
                              <span className="text-[11px] text-slate-500">본문 직접 수정 필요</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* 원문 */}
        <Card className="min-w-0">
          <CardHeader
            title={editing ? '본문 수정' : '원문'}
            right={
              editing ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                    취소
                  </Button>
                  <Button size="sm" onClick={recheck}>
                    재점검
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => startEdit()}>
                  본문 수정 후 재점검
                </Button>
              )
            }
          />
          {editing ? (
            <div className="space-y-3 p-4">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-[13px] focus:border-brand-500 focus:outline-none"
                aria-label="파일명"
              />
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={Math.max(12, splitLines(editBody).length + 2)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-[13px] leading-6 focus:border-brand-500 focus:outline-none"
                aria-label="본문"
              />
              {sel && (
                <div className="rounded bg-brand-50 px-3 py-2 text-xs text-brand-800">
                  수정 대상: {sel.ruleId} · {sel.location} — {sel.suggestion}
                </div>
              )}
            </div>
          ) : (
            <div className="max-h-[480px] overflow-auto py-2 font-mono text-[13px] leading-6">
              <div
                id="line-file"
                className={`flex gap-3 px-3 ${fileViolation ? 'bg-red-50' : ''} ${sel?.location === '파일명' ? 'ring-2 ring-inset ring-brand-500' : ''}`}
              >
                <span className="w-8 shrink-0 select-none text-right text-slate-400">파일</span>
                <span className="break-all text-slate-600">{draft.fileName || '(파일명 없음)'}</span>
              </div>
              <div className="my-1 border-t border-dashed border-slate-200" />
              {lines.map((text, i) => {
                const n = i + 1
                const sev = lineSeverity.get(n)
                const bg = sev === '필수' ? 'bg-red-50' : sev === '권고' ? 'bg-amber-50' : ''
                const isSel = sel?.line === n
                return (
                  <div
                    key={i}
                    id={`line-${n}`}
                    className={`flex gap-3 px-3 ${bg} ${isSel ? 'ring-2 ring-inset ring-brand-500' : ''}`}
                    onClick={() => {
                      const v = result.violations.find((x) => x.line === n)
                      if (v) setSelected(v.key)
                    }}
                  >
                    <span className="w-8 shrink-0 select-none text-right text-slate-400">{n}</span>
                    <span className="min-w-0 whitespace-pre-wrap break-all">{text || ' '}</span>
                  </div>
                )
              })}
              <div
                id="line-end"
                className={`mx-3 mt-1 rounded border border-dashed px-2 py-1 text-xs ${result.violations.some((v) => v.location === '문서 끝') ? 'border-red-300 bg-red-50 text-red-700' : 'border-transparent text-slate-400'} ${sel?.location === '문서 끝' ? 'ring-2 ring-brand-500' : ''}`}
              >
                {result.violations.some((v) => v.location === '문서 끝') ? '⟂ 문서 끝 — "문서 이력" 절 필요' : '⟂ 문서 끝'}
              </div>
            </div>
          )}
        </Card>

        {/* 근거 조항 */}
        <Card className="h-fit lg:sticky lg:top-20">
          <CardHeader title="근거 조항" />
          {sel ? (
            <div className="space-y-3 p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-semibold">{sel.ruleId}</span>
                <SeverityBadge severity={sel.severity} />
                <JudgeBadge judge={sel.judge} />
              </div>
              <div className="font-medium text-slate-900">{RULE_BY_ID[sel.ruleId].title}</div>
              <blockquote className="border-l-2 border-brand-500 bg-slate-50 px-3 py-2 text-slate-700">
                {RULE_BY_ID[sel.ruleId].text}
              </blockquote>
              <div>
                <div className="text-xs font-medium text-slate-500">규칙 존재 이유</div>
                <p className="mt-0.5 text-slate-700">{RULE_BY_ID[sel.ruleId].reason}</p>
              </div>
              {sel.judge === 'AI 시연' && (
                <p className="rounded bg-violet-50 px-2.5 py-2 text-xs text-violet-800">
                  AI 판정 (시연용): 실제 LLM 대신 패턴 기반 모의 판정. AI 판정은 권고로만 분류되어 검토 요청을 막지 않음
                </p>
              )}
            </div>
          ) : (
            <Empty>위반 항목을 선택하세요</Empty>
          )}
        </Card>
      </div>
    </div>
  )
}
