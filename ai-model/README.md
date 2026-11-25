# AI 모델 실행 — Kanana로 문맥 규칙 판정

문서 규칙 점검기의 문맥 규칙 5개(C-03, C-04, C-06, M-01, P-02)를
카카오 **Kanana 1.5 2.1B Instruct**로 판정하는 프로그램. 모든 데이터는 가상 데이터.

## 실행 방법 (GitHub Codespaces)

1. GitHub 저장소 페이지 → **Code** → **Codespaces** → **Create codespace on main**
2. 설치가 끝날 때까지 대기 (처음 한 번, 수 분)
3. 터미널에서 실행

```bash
cd ai-model
python main.py
```

- 처음 실행할 때 모델(약 4~5GB)을 내려받아 몇 분 걸림
- 모델 없이 흐름만 확인: `python main.py --mock`
- 8B 모델로 실행 (GPU 권장): `python main.py --model kakaocorp/kanana-1.5-8b-instruct-2505`

## 파일 구성

| 파일 | 내용 |
|---|---|
| `main.py` | 실행 진입점. 판정 → 정답·패턴 판정과 비교 → 결과 저장 |
| `llm_judge.py` | Kanana 모델 로딩·판정, 출력 JSON 해석 |
| `prompts.py` | 규칙 원문과 판정 예시 (few-shot) |
| `pattern_judge.py` | 비교 기준: 기존 정규식 패턴 판정 |
| `data/test_cases.json` | 샘플 문장 15건 + 정답 (가상 데이터) |
| `results/` | 실행 결과 (md, json) |

## 사용이 끝나면

Codespace는 켜 둔 시간만큼 무료 사용량이 줄어듦.
github.com/codespaces 에서 **Stop** 또는 **Delete** 하면 내려받은 모델도 함께 정리됨.
