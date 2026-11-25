"""문서 규칙 점검기 — AI 모델(Kanana) 실행 프로그램

샘플 데이터(data/test_cases.json)의 문장마다 문맥 규칙 위반 여부를 Kanana로 판정하고,
정답·기존 패턴 판정과 비교해 정확도를 보여 준다.

실행:
    python main.py            # Kanana 2.1B로 실행
    python main.py --mock     # 모델 없이 실행 흐름만 확인
    python main.py --model kakaocorp/kanana-1.5-8b-instruct-2505   # 8B로 실행 (GPU 권장)
"""
import argparse
import json
import time
from datetime import datetime
from pathlib import Path

import pattern_judge
from llm_judge import DEFAULT_MODEL, KananaJudge, MockJudge

HERE = Path(__file__).parent
OK, NG = "O", "X"


def mark(pred: bool, expected: bool) -> str:
    return OK if pred == expected else NG


def label(v: bool) -> str:
    return "위반" if v else "정상"


def short(text: str, n: int = 34) -> str:
    return text if len(text) <= n else text[: n - 1] + "…"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--dtype", default="float32", choices=["float32", "bfloat16"])
    ap.add_argument("--mock", action="store_true", help="모델 없이 실행 흐름만 확인")
    args = ap.parse_args()

    cases = json.loads((HERE / "data" / "test_cases.json").read_text(encoding="utf-8"))
    judge = MockJudge() if args.mock else KananaJudge(args.model, args.dtype)
    model_name = "MOCK" if args.mock else args.model

    print(f"\n문맥 규칙 판정 — {len(cases)}건  (모델: {model_name})\n")
    rows = []
    for c in cases:
        t0 = time.time()
        ai = judge.judge(c["rule"], c["text"])
        sec = time.time() - t0
        pt = pattern_judge.judge(c["rule"], c["text"])
        rows.append({**c, "ai": ai, "pattern": pt, "seconds": round(sec, 1)})
        print(
            f"[{c['id']:>2}] {c['rule']}  정답 {label(c['expected'])}"
            f" | AI {label(ai['violation'])} {mark(ai['violation'], c['expected'])}"
            f" | 패턴 {label(pt['violation'])} {mark(pt['violation'], c['expected'])}"
            f" | {sec:5.1f}초 | {short(c['text'])}"
        )
        print(f"      AI 이유: {ai['reason']}")
        if ai.get("suggestion"):
            print(f"      AI 수정안: {ai['suggestion']}")

    n = len(rows)
    ai_ok = sum(r["ai"]["violation"] == r["expected"] for r in rows)
    pt_ok = sum(r["pattern"]["violation"] == r["expected"] for r in rows)
    parse_err = sum(bool(r["ai"].get("parse_error")) for r in rows)
    avg = sum(r["seconds"] for r in rows) / n

    print("\n" + "=" * 60)
    print(f"AI 모델 정확도   : {ai_ok}/{n} ({ai_ok / n:.0%})")
    print(f"패턴 판정 정확도 : {pt_ok}/{n} ({pt_ok / n:.0%})")
    print(f"JSON 형식 오류   : {parse_err}건")
    print(f"문장당 평균 시간 : {avg:.1f}초 (모델 로딩 {judge.load_seconds:.0f}초 별도)")
    diff = [r for r in rows if mark(r["ai"]["violation"], r["expected"]) != mark(r["pattern"]["violation"], r["expected"])]
    if diff:
        print("\nAI와 패턴의 결과가 갈린 문장:")
        for r in diff:
            who = "AI만 정답" if r["ai"]["violation"] == r["expected"] else "패턴만 정답"
            print(f"  [{r['id']:>2}] {r['rule']} {who} — {short(r['text'], 50)}")
    print("=" * 60)

    save(rows, model_name, ai_ok, pt_ok, parse_err, avg, judge.load_seconds)


def save(rows, model_name, ai_ok, pt_ok, parse_err, avg, load_sec):
    out = HERE / "results"
    out.mkdir(exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M")
    tag = "mock" if model_name == "MOCK" else model_name.split("/")[-1]
    n = len(rows)

    (out / f"result_{tag}_{stamp}.json").write_text(
        json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    md = [
        f"# 실행 결과 — {model_name}",
        "",
        f"- 실행 시각: {datetime.now():%Y-%m-%d %H:%M}",
        f"- AI 모델 정확도: {ai_ok}/{n} ({ai_ok / n:.0%})",
        f"- 패턴 판정 정확도: {pt_ok}/{n} ({pt_ok / n:.0%})",
        f"- JSON 형식 오류: {parse_err}건",
        f"- 문장당 평균 시간: {avg:.1f}초 (모델 로딩 {load_sec:.0f}초 별도)",
        "",
        "| # | 규칙 | 문장 | 정답 | AI | 패턴 | AI 이유 | AI 수정안 |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for r in rows:
        md.append(
            f"| {r['id']} | {r['rule']} | {r['text']} | {label(r['expected'])}"
            f" | {label(r['ai']['violation'])} {mark(r['ai']['violation'], r['expected'])}"
            f" | {label(r['pattern']['violation'])} {mark(r['pattern']['violation'], r['expected'])}"
            f" | {r['ai']['reason']} | {r['ai'].get('suggestion', '')} |"
        )
    path = out / f"result_{tag}_{stamp}.md"
    path.write_text("\n".join(md) + "\n", encoding="utf-8")
    print(f"\n결과 저장: {path.relative_to(HERE)}")


if __name__ == "__main__":
    main()
