"""비교 기준: 중간평가 프로토타입의 패턴(정규식) 판정을 그대로 옮긴 것.

AI 모델이 패턴보다 나은지 확인하려고 같은 데이터로 함께 돌린다.
"""
import re

C03 = re.compile(r"(습니다|하였다|했다|한다|된다|바랍니다|입니다)\.?$")
C04 = re.compile(r"(하였고|했고|되었고|이며|하며)")
C06_WEAK = re.compile(r"(협의 결과|논의 결과|회의 결과|검토 결과)")
P02_KEYWORDS = re.compile(r"(손상|오동작|유실|금지|화재|감전|파손|오결선|사고|위험)")
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _field(text: str, name: str) -> str | None:
    m = re.search(rf"{name}:\s*([^/]*)", text)
    return m.group(1).strip() if m else None


def judge(rule_id: str, text: str) -> dict:
    t = text.strip()
    if rule_id == "C-03":
        v = bool(C03.search(t))
        return {"violation": v, "reason": "서술형 종결 어미" if v else "명사형 종결", "suggestion": ""}
    if rule_id == "C-04":
        m = C04.search(t)
        return {"violation": bool(m), "reason": f'"{m.group(1)}"로 연결' if m else "연결 어미 없음", "suggestion": ""}
    if rule_id == "C-06":
        reason = _field(t, "이유") or ""
        v = not reason or bool(C06_WEAK.search(reason)) or len(reason.replace(" ", "")) < 6
        return {"violation": v, "reason": f'이유 "{reason}"', "suggestion": ""}
    if rule_id == "M-01":
        due = _field(t, "기한") or ""
        v = not DATE.match(due)
        return {"violation": v, "reason": f'기한 "{due}"', "suggestion": ""}
    if rule_id == "P-02":
        v = not P02_KEYWORDS.search(t)
        return {"violation": v, "reason": "사고 키워드 없음" if v else "사고 키워드 있음", "suggestion": ""}
    raise ValueError(f"알 수 없는 규칙: {rule_id}")
