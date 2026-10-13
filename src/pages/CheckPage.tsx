import { useState } from 'react'
import { DOC_TYPE_LABEL, type DocType } from '../rules'
import { SAMPLES } from '../samples'
import { useStore } from '../store'
import { Button, Card, go, useToast } from '../ui'

const PLACEHOLDER = `작성일: 2026-10-06

1. 시험 개요
시험 대상: ...
2. 시험 결과
...
3. 문서 이력
v1.0 / 2026-10-06 / 최초 작성`

export default function CheckPage() {
  const { state, startCheck } = useStore()
  const toast = useToast()
  const [docType, setDocType] = useState<DocType>(state.draft?.docType ?? 'report')
  const [fileName, setFileName] = useState(state.draft?.fileName ?? '')
  const [body, setBody] = useState(state.draft?.body ?? '')
  const [loaded, setLoaded] = useState<string | null>(null)
  const rejected = state.requests.find((r) => r.status === 'rejected')

  if (state.role === 'reviewer') {
    return (
      <Card className="p-6 text-sm text-slate-600">
        문서 점검은 작성자 화면 기능입니다. 상단에서 <b>작성자</b>로 전환하거나{' '}
        <a href="#/inbox" className="text-brand-600 underline">검토함</a>으로 이동하세요.
      </Card>
    )
  }

  const loadSample = (i: number) => {
    const s = SAMPLES[i]
    setDocType(s.docType)
    setFileName(s.fileName)
    setBody(s.body)
    setLoaded(s.label)
  }

  const submit = () => {
    if (!body.trim()) return toast('본문을 입력하세요')
    startCheck({ docType, fileName: fileName.trim(), body })
    go('result')
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-gradient-to-r from-brand-700 to-brand-500 px-5 py-5 text-white">
        <h1 className="text-lg font-bold sm:text-xl">문서를 붙여넣으면 사내 작성 규칙 위반을 찾아 수정안을 제시합니다</h1>
        <p className="mt-1.5 text-sm text-brand-100">
          형식 규칙은 코드가 판정(필수), 문맥 규칙은 AI가 판정(권고). 필수 위반이 0건이어야 검토 요청 가능.
        </p>
        <p className="mt-3 inline-block rounded bg-white/15 px-2.5 py-1 text-xs">
          ▶ 처음이라면 아래 <b>샘플로 바로 체험</b> 버튼부터
        </p>
      </div>

      {rejected && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <b>반려된 문서 있음</b> — {rejected.fileName} · 사유: {rejected.rejectReason}{' '}
          <a href="#/inbox" className="underline">내 요청 보기</a>
        </div>
      )}

      <Card className="p-4">
        <div className="mb-2 text-sm font-semibold text-slate-900">샘플로 바로 체험</div>
        <div className="grid gap-2 sm:grid-cols-3">
          {SAMPLES.map((s, i) => (
            <button
              key={s.fileName}
              onClick={() => loadSample(i)}
              className={`rounded-md border px-3 py-2.5 text-left text-sm transition-colors hover:border-brand-500 hover:bg-brand-50 ${loaded === s.label ? 'border-brand-500 bg-brand-50' : 'border-slate-200'}`}
            >
              <div className="font-medium text-slate-900">{s.label}</div>
              <div className="mt-0.5 text-xs text-slate-500">예상 결과: {s.expected}</div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-4 p-4">
        <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">문서 종류</span>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocType)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 focus:border-brand-500 focus:outline-none"
            >
              {(Object.keys(DOC_TYPE_LABEL) as DocType[]).map((t) => (
                <option key={t} value={t}>
                  {DOC_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">파일명</span>
            <input
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="[프로젝트]_[문서명]_[yyyyMMdd].docx"
              className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-[13px] focus:border-brand-500 focus:outline-none"
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            본문 <span className="font-normal text-slate-500">— "작성일: YYYY-MM-DD" + "숫자. 절 제목" 구조</span>
          </span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={PLACEHOLDER}
            rows={14}
            className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-[13px] leading-6 focus:border-brand-500 focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-slate-500">docx 업로드는 시연 범위 제외 — 본문 붙여넣기로 점검</span>
          <Button onClick={submit} disabled={!body.trim()}>
            점검하기
          </Button>
        </div>
      </Card>
    </div>
  )
}
