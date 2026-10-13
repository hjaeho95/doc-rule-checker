import type { DocType } from './rules'

export interface Sample {
  docType: DocType
  label: string
  fileName: string
  body: string
  expected: string
}

// 가상 데이터. 명세서 5절과 동일
export const SAMPLES: Sample[] = [
  {
    docType: 'report',
    label: '시험결과보고서',
    expected: '보완 필요',
    fileName: '가상레이더_시험결과보고서_2026.10.05.docx',
    body: `작성일: 2026-10-06

1. 시험 개요
시험 대상: 가상레이더 통신 모듈
시험 일자: 2026-10-05
2. 시험 결과
시험 중 통신이 끊기는 현상이 발생하여 원인을 분석하였습니다.
SBC 재부팅 후 정상 동작을 확인하였고 로그는 서버에 업로드함
3. 결정 사항
기존 메시지 형식 현행 유지 / 이유: 협의 결과`,
  },
  {
    docType: 'minutes',
    label: '주간회의록',
    expected: '검토 요청 가능',
    fileName: '가상레이더_주간회의록_20261006.md',
    body: `작성일: 2026-10-06

1. 회의 개요
일시: 2026-10-06 10:00
참석: 작성자A, 작성자B
2. 결정 사항
통신 타임아웃 500ms 유지 / 이유: 타 장비 응답 지연 최대 420ms
3. Action Item
인터페이스 시험 결과 공유 / 담당: 작성자A / 기한: 다음 주쯤
타임아웃 설정값 문서 반영 / 담당: 작성자B / 기한: 2026-10-10
4. 문서 이력
v1.0 / 2026-10-06 / 최초 작성`,
  },
  {
    docType: 'procedure',
    label: '통신시험 절차서',
    expected: '보완 필요',
    fileName: '가상레이더_통신시험절차서_20261006.md',
    body: `작성일: 2026-10-06

1. 목적
가상레이더 통신 모듈 기능 시험 절차 정의
2. 수행 절차
1) 시험 장비 전원 인가
시험 프로그램 실행
3) 송수신 로그 저장
3. 주의사항
전원 인가 전 케이블 연결 확인 — 오결선 시 장비 손상
시험 프로그램 실행 속도 느림, 참고
4. 문서 이력
v1.0 / 2026-10-06 / 최초 작성`,
  },
]
