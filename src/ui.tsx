import { createContext, useCallback, useContext, useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'

// ---------- 라우팅 (해시 기반, Pages 하위 경로 호환) ----------
export type Route = 'check' | 'result' | 'preview' | 'request' | 'inbox' | 'docs' | 'rules'
const ROUTES: Route[] = ['check', 'result', 'preview', 'request', 'inbox', 'docs', 'rules']

function parseHash(): Route {
  const h = window.location.hash.replace(/^#\/?/, '') as Route
  return ROUTES.includes(h) ? h : 'check'
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parseHash)
  useEffect(() => {
    const on = () => {
      setRoute(parseHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

export function go(route: Route) {
  window.location.hash = `/${route}`
}

// ---------- 공통 요소 ----------
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
const VARIANT: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-slate-300',
  secondary: 'bg-white text-brand-700 border border-brand-200 hover:bg-brand-50 disabled:text-slate-400 disabled:border-slate-200',
  ghost: 'text-brand-600 hover:bg-brand-50 disabled:text-slate-400',
  danger: 'bg-white text-red-700 border border-red-200 hover:bg-red-50',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-4 py-2 text-sm'
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors disabled:cursor-not-allowed ${sz} ${VARIANT[variant]} ${className}`}
      {...props}
    />
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-slate-200 bg-white ${className}`}>{children}</section>
}

export function CardHeader({ title, right }: { title: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {right}
    </div>
  )
}

export function SeverityBadge({ severity }: { severity: string }) {
  const cls = severity === '필수' ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-amber-50 text-amber-800 ring-amber-200'
  return <span className={`inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>{severity}</span>
}

export function JudgeBadge({ judge }: { judge: string }) {
  if (judge === '코드')
    return <span className="inline-block whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">코드</span>
  return (
    <span className="inline-block whitespace-nowrap rounded bg-violet-50 px-1.5 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-200">
      AI 판정 (시연용)
    </span>
  )
}

export function StatusBadge({ ok, large }: { ok: boolean; large?: boolean }) {
  const sz = large ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'
  return ok ? (
    <span className={`inline-flex items-center gap-1 rounded-full bg-emerald-100 font-semibold text-emerald-800 ${sz}`}>● 검토 요청 가능</span>
  ) : (
    <span className={`inline-flex items-center gap-1 rounded-full bg-red-100 font-semibold text-red-800 ${sz}`}>● 보완 필요</span>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="px-4 py-10 text-center text-sm text-slate-500">{children}</div>
}

// ---------- 토스트 ----------
const ToastContext = createContext<(msg: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string }[]>([])
  const push = useCallback((msg: string) => {
    const id = Date.now() + Math.random()
    setItems((xs) => [...xs, { id, msg }])
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3200)
  }, [])
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto max-w-md rounded-md bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg">
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
