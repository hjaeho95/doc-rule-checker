import { StoreProvider, useStore, type Role } from './store'
import { go, ToastProvider, useRoute, useToast, type Route } from './ui'
import CheckPage from './pages/CheckPage'
import ResultPage from './pages/ResultPage'
import PreviewPage from './pages/PreviewPage'
import RequestPage from './pages/RequestPage'
import InboxPage from './pages/InboxPage'
import DocsPage from './pages/DocsPage'
import RulesPage from './pages/RulesPage'

const MENU: { route: Route; label: string; match: Route[] }[] = [
  { route: 'check', label: '점검', match: ['check', 'result', 'preview', 'request'] },
  { route: 'inbox', label: '검토함', match: ['inbox'] },
  { route: 'docs', label: '문서목록', match: ['docs'] },
  { route: 'rules', label: '규칙집', match: ['rules'] },
]

function Header({ route }: { route: Route }) {
  const { state, setRole } = useStore()
  const toast = useToast()
  const pending = state.requests.filter((r) => r.status === 'pending').length

  const switchRole = (role: Role) => {
    if (role === state.role) return
    setRole(role)
    toast(role === 'author' ? '작성자 화면으로 전환' : '검토자 화면으로 전환')
    go(role === 'author' ? 'check' : 'inbox')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-brand-800 bg-brand-700 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
        <a href="#/check" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded bg-white/15 text-sm">✓</span>
          문서 규칙 점검기
        </a>
        <nav className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
          {MENU.map((m) => {
            const active = m.match.includes(route)
            return (
              <a
                key={m.route}
                href={`#/${m.route}`}
                className={`relative whitespace-nowrap rounded px-3 py-1.5 text-sm ${active ? 'bg-white/15 font-semibold' : 'text-brand-100 hover:bg-white/10'}`}
              >
                {m.label}
                {m.route === 'inbox' && pending > 0 && (
                  <span className="ml-1.5 rounded-full bg-amber-400 px-1.5 text-xs font-bold text-brand-900">{pending}</span>
                )}
              </a>
            )
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2 text-xs">
          <span className="hidden text-brand-100 sm:inline">역할</span>
          <div className="flex rounded-md bg-brand-900/50 p-0.5" role="group" aria-label="역할 전환">
            {(['author', 'reviewer'] as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => switchRole(r)}
                aria-pressed={state.role === r}
                className={`rounded px-3 py-1 font-medium ${state.role === r ? 'bg-white text-brand-800' : 'text-brand-100 hover:text-white'}`}
              >
                {r === 'author' ? '작성자' : '검토자'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}

function Shell() {
  const route = useRoute()
  const { reset } = useStore()
  const toast = useToast()
  const Page = {
    check: CheckPage,
    result: ResultPage,
    preview: PreviewPage,
    request: RequestPage,
    inbox: InboxPage,
    docs: DocsPage,
    rules: RulesPage,
  }[route]
  return (
    <div className="flex min-h-screen flex-col">
      <Header route={route} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Page />
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-slate-500">
          <span>AI 활용 과제 프로토타입 · 모든 문서·규칙·인물은 가상 데이터 · 데이터는 이 브라우저에만 저장</span>
          <button
            className="underline hover:text-slate-700"
            onClick={() => {
              if (confirm('검토 요청·문서목록 등 저장된 시연 데이터를 초기화할까요?')) {
                reset()
                go('check')
                toast('시연 데이터 초기화 완료')
              }
            }}
          >
            시연 데이터 초기화
          </button>
        </div>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </StoreProvider>
  )
}
