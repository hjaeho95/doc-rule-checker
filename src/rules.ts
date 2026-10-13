export type DocType = 'report' | 'minutes' | 'procedure'
export type RuleScope = 'common' | 'minutes' | 'procedure'

export const DOC_TYPE_LABEL: Record<DocType, string> = {
  report: '시험결과보고서',
  minutes: '회의록',
  procedure: '절차서',
}

export const SCOPE_LABEL: Record<RuleScope, string> = {
  common: '공통',
  minutes: '회의록',
  procedure: '절차서',
}

export interface Rule {
  id: string
  scope: RuleScope
  title: string
  judge: string
  severity: string
  /** 규칙 원문 (근거 조항 패널) */
  text: string
  /** 규칙 존재 이유 */
  reason: string
  /** 규칙 질의 키워드 매칭용 */
  keywords: string[]
}

// 가상 사내 표준. 실제 조직 규칙 아님
export const RULES: Rule[] = [
  {
    id: 'C-01',
    scope: 'common',
    title: '파일명 형식 [프로젝트]_[문서명]_[yyyyMMdd].확장자',
    judge: '코드',
    severity: '필수',
    text: '파일명은 [프로젝트]_[문서명]_[yyyyMMdd].확장자 형식으로 작성. 날짜는 구분자 없는 8자리. 확장자는 docx, md, txt',
    reason: '문서 저장소 검색·정렬 기준 통일. 형식이 섞이면 최신본 식별 실패',
    keywords: ['파일명', '형식', '확장자', '이름', '언더바', '_'],
  },
  {
    id: 'C-02',
    scope: 'common',
    title: '파일명 날짜 = 본문 작성일',
    judge: '코드',
    severity: '필수',
    text: '파일명 날짜는 본문 "작성일:" 값과 동일해야 함. 시험일·회의일이 아닌 문서 작성일 기준',
    reason: '시험일·회의일과 작성일 혼용 시 같은 문서의 판이 서로 다른 날짜로 보관됨. 기준을 작성일 하나로 고정',
    keywords: ['날짜', '작성일', '기준', '언제', '파일명 날짜'],
  },
  {
    id: 'C-03',
    scope: 'common',
    title: '설명부 개조식 (명사형 종결)',
    judge: 'AI 시연',
    severity: '권고',
    text: '설명 문장은 "~함", "~발생", "~확인" 등 명사형으로 종결. "~습니다", "~하였다" 서술형 지양',
    reason: '검토자가 핵심만 빠르게 읽도록 문장 길이 축소. 문서 간 문체 통일',
    keywords: ['개조식', '명사형', '종결', '문체', '습니다', '서술형'],
  },
  {
    id: 'C-04',
    scope: 'common',
    title: '한 문장 한 내용',
    judge: 'AI 시연',
    severity: '권고',
    text: '한 문장에 하나의 사실만 기재. "~하였고", "~이며" 등으로 여러 사실 연결 지양',
    reason: '여러 사실이 한 문장에 묶이면 일부만 수정·추적하기 어려움',
    keywords: ['한 문장', '문장', '연결', '하였고', '분리', '한 내용'],
  },
  {
    id: 'C-05',
    scope: 'common',
    title: '마지막 절 "문서 이력"',
    judge: '코드',
    severity: '필수',
    text: '문서 마지막 절은 "문서 이력". 판(버전) / 날짜 / 변경 내용 기재',
    reason: '변경 경위가 문서 안에 남아야 이전 판과 비교·감사 가능',
    keywords: ['문서 이력', '이력', '버전', '판', '마지막 절', '변경'],
  },
  {
    id: 'C-06',
    scope: 'common',
    title: '결정 사항에 이유 기재',
    judge: '코드 / AI 시연',
    severity: '필수 / 권고',
    text: '"결정 사항" 절의 각 결정에 "이유:" 기재. 이유 누락은 필수 위반. "협의 결과" 등 근거 없는 이유는 권고 위반',
    reason: '시간이 지나 결정을 뒤집으려는 사람을 막는 근거. "협의 결과"만으로는 왜 그렇게 정했는지 알 수 없음',
    keywords: ['결정', '이유', '근거', '결정 사항', '협의', '어느 정도'],
  },
  {
    id: 'M-01',
    scope: 'minutes',
    title: 'Action Item 담당·기한 기재',
    judge: '코드 / AI 시연',
    severity: '필수 / 권고',
    text: '회의록 "Action Item" 절 각 항목에 "담당:"과 "기한:" 기재. 기한은 YYYY-MM-DD 날짜',
    reason: '담당·기한 없는 할 일은 아무도 하지 않음. "다음 주쯤"은 추적 불가',
    keywords: ['action item', '액션', '담당', '기한', '할 일', '회의록'],
  },
  {
    id: 'P-01',
    scope: 'procedure',
    title: '수행 단계 번호 부여',
    judge: '코드',
    severity: '필수',
    text: '절차서 "수행 절차" 절 각 단계는 "1)" 또는 "1." 형태 번호로 시작',
    reason: '시험 중 단계 누락·순서 착오 방지. 결과 보고 시 단계 번호로 위치 지칭',
    keywords: ['단계', '번호', '수행 절차', '순서', '절차서'],
  },
  {
    id: 'P-02',
    scope: 'procedure',
    title: '주의사항은 사고 유발 사항만',
    judge: 'AI 시연',
    severity: '권고',
    text: '절차서 "주의사항" 절에는 장비 손상·인명 사고·데이터 유실 등 사고 유발 사항만 기재',
    reason: '사소한 참고 사항이 섞이면 정말 위험한 주의사항이 묻힘',
    keywords: ['주의사항', '주의', '사고', '위험', '손상', '뭘 넣'],
  },
]

export const RULE_BY_ID: Record<string, Rule> = Object.fromEntries(RULES.map((r) => [r.id, r]))

export function rulesFor(docType: DocType): Rule[] {
  return RULES.filter((r) => r.scope === 'common' || r.scope === docType)
}
