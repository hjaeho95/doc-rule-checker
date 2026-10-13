import { DOC_TYPE_LABEL } from '../rules'
import { formatTime, useStore } from '../store'
import { Card, CardHeader } from '../ui'

export default function DocsPage() {
  const { state } = useStore()
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-900">문서목록</h1>
        <p className="text-sm text-slate-500">검토 승인 시 자동 등록</p>
      </div>
      <Card>
        <CardHeader title={`승인 문서 (${state.registry.length})`} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">문서명</th>
                <th className="px-4 py-2 font-medium">종류</th>
                <th className="px-4 py-2 font-medium">승인자</th>
                <th className="px-4 py-2 font-medium">승인 시각</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.registry.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-2.5 font-mono text-[13px]">
                    {d.name}
                    {!d.id.startsWith('seed') && (
                      <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 font-sans text-xs font-semibold text-emerald-800">NEW</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">{DOC_TYPE_LABEL[d.docType]}</td>
                  <td className="px-4 py-2.5">{d.approver}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{formatTime(d.approvedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
