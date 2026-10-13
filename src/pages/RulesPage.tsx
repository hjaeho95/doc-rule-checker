import { useState } from 'react'
import { answer, EXAMPLE_QUESTIONS, type Answer } from '../qa'
import { RULES, SCOPE_LABEL, type RuleScope } from '../rules'
import { Button, Card, CardHeader, JudgeBadge, SeverityBadge } from '../ui'

type Filter = 'all' | RuleScope

export default function RulesPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [asked, setAsked] = useState<{ q: string; a: Answer } | null>(null)
  const rules = RULES.filter((r) => filter === 'all' || r.scope === filter)

  const ask = (text: string) => {
    if (!text.trim()) return
    setQ(text)
    setAsked({ q: text, a: answer(text) })
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-900">규칙집</h1>
        <p className="text-sm text-slate-500">가상 사내 문서 작성 표준 · 9개 규칙</p>
      </div>

      <Card>
        <CardHeader
          title="규칙 질의"
          right={<span className="rounded bg-violet-50 px-1.5 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-200">AI 답변 (시연용)</span>}
        />
        <div className="space-y-3 p-4">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              ask(q)
            }}
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="이 규칙 왜 있어?"
              className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
            <Button type="submit" disabled={!q.trim()}>
              질문
            </Button>
          </form>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUESTIONS.map((x) => (
              <button
                key={x}
                onClick={() => ask(x)}
                className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs text-brand-700 hover:bg-brand-100"
              >
                {x}
              </button>
            ))}
          </div>
          {asked && (
            <div className="rounded-md border border-violet-200 bg-violet-50/50 p-3 text-sm">
              <div className="text-xs text-slate-500">Q. {asked.q}</div>
              <p className="mt-1.5 text-slate-800">{asked.a.text}</p>
              {asked.a.rules.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-slate-500">근거 규칙</span>
                  {asked.a.rules.map((r) => (
                    <button key={r.id} onClick={() => document.getElementById(`rule-${r.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="rounded bg-white px-1.5 py-0.5 font-mono font-semibold text-brand-700 ring-1 ring-brand-200">
                      {r.id}
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-2 text-[11px] text-violet-700">AI 답변 (시연용) — 키워드 매칭 모의 응답. 실제 서비스는 규칙집 검색(RAG) + LLM 답변</p>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="규칙 목록"
          right={
            <div className="flex gap-1">
              {(['all', 'common', 'minutes', 'procedure'] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded px-2.5 py-1 text-xs font-medium ${filter === f ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  {f === 'all' ? '전체' : SCOPE_LABEL[f]}
                </button>
              ))}
            </div>
          }
        />
        <ul className="divide-y divide-slate-100">
          {rules.map((r) => (
            <li key={r.id} id={`rule-${r.id}`} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[72px_1fr_auto]">
              <div>
                <div className="font-mono font-semibold text-slate-900">{r.id}</div>
                <div className="text-xs text-slate-500">{SCOPE_LABEL[r.scope]}</div>
              </div>
              <div className="min-w-0">
                <div className="font-medium text-slate-900">{r.title}</div>
                <div className="mt-0.5 text-slate-600">{r.text}</div>
                <div className="mt-1 text-xs text-slate-500">
                  <span className="font-medium text-slate-600">이유</span> {r.reason}
                </div>
              </div>
              <div className="flex flex-wrap items-start gap-1 sm:flex-col sm:items-end">
                {r.severity.split(' / ').map((s) => (
                  <SeverityBadge key={s} severity={s} />
                ))}
                {r.judge.split(' / ').map((j) => (
                  <JudgeBadge key={j} judge={j} />
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
