import { RULES, type Rule } from './rules'

export interface Answer {
  rules: Rule[]
  text: string
}

// 예시 질문 답변. 규칙 원문 기반
const PRESET: Record<string, string> = {
  'C-02':
    '파일명 날짜는 본문 첫 줄의 "작성일" 기준. 시험일·회의일이 아님. 예: 10월 5일 시험, 10월 6일 작성 → 파일명 날짜 20261006. 판마다 날짜 기준이 섞이면 같은 문서가 서로 다른 날짜로 보관되기 때문.',
  'C-06':
    '나중에 누군가 "이거 왜 이렇게 했지? 바꾸자"고 할 때 막을 수 있을 정도. "협의 결과"처럼 결론만 있는 이유는 부족(권고 위반). 수치·제약·대안 비교 중 하나는 포함. 예: "타 장비 응답 지연 최대 420ms".',
  'P-02':
    '장비 손상·인명 사고·데이터 유실처럼 지키지 않으면 사고가 나는 사항만. "실행 속도 느림" 같은 참고 사항은 제외. 사소한 항목이 섞이면 정말 위험한 주의사항이 묻히기 때문.',
}

export const EXAMPLE_QUESTIONS = ['파일명 날짜는 언제 기준이야?', '결정 이유는 어느 정도로 써야 해?', '주의사항에 뭘 넣어야 해?']

/** 키워드 매칭 기반 모의 응답 (실제 서비스는 RAG + LLM) */
export function answer(question: string): Answer {
  const q = question.toLowerCase().replace(/\s+/g, ' ')
  const scored = RULES.map((r) => {
    let score = q.includes(r.id.toLowerCase()) ? 10 : 0
    for (const k of r.keywords) if (q.includes(k.toLowerCase())) score += k.length >= 3 ? 2 : 1
    return { r, score }
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)

  if (!scored.length) {
    return {
      rules: [],
      text: '관련 규칙을 찾지 못함. 규칙 ID(예: C-02)나 키워드(파일명, 작성일, 결정 이유, 기한, 주의사항 등)를 넣어 다시 질문.',
    }
  }
  const top = scored[0].r
  const related = scored.slice(0, 2).filter((x, i) => i === 0 || x.score >= scored[0].score - 1).map((x) => x.r)
  const text = PRESET[top.id] ?? `${top.title}. ${top.text}. 이유: ${top.reason}.`
  return { rules: related, text }
}
