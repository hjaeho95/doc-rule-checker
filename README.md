# 문서 규칙 점검기

문서 작성 규칙 자동 점검 서비스 프로토타입 (AI 활용 과제)

- 문서 본문 입력 → 사내 문서 규칙 위반 판정 → 수정안 제시 → 검토 요청·승인
- 형식 규칙: 코드 판정 (필수)
- 문맥 규칙: AI 판정 시연 (권고, 패턴 기반 모의)
- 모든 데이터 가상

서비스 링크: https://hjaeho95.github.io/doc-rule-checker/

## 실행

```bash
npm install
npm run dev     # 개발 서버
npm test        # 판정 로직 검증 (샘플 3종 기대 건수, 수정 흐름)
npm run build   # dist/ 생성
```

main 푸시 시 GitHub Actions가 테스트·빌드 후 Pages 배포
