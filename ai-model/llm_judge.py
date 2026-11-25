"""Kanana 모델로 문맥 규칙을 판정한다.

모델을 따로 학습시키지 않고, 프롬프트에 규칙 원문과 예시를 넣어 판정하게 한다(few-shot).
"""
import json
import re
import time

from prompts import SYSTEM_PROMPT, build_user_prompt

DEFAULT_MODEL = "kakaocorp/kanana-1.5-2.1b-instruct-2505"


class KananaJudge:
    def __init__(self, model_id: str = DEFAULT_MODEL, dtype: str = "float32"):
        # 무거운 라이브러리는 실제로 모델을 쓸 때만 불러온다 (--mock 실행은 설치 없이 가능)
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer

        self.torch = torch
        t0 = time.time()
        print(f"모델 불러오는 중: {model_id} (처음에는 내려받기 때문에 몇 분 걸림)")
        self.tokenizer = AutoTokenizer.from_pretrained(model_id)
        self.model = AutoModelForCausalLM.from_pretrained(
            model_id,
            torch_dtype=getattr(torch, dtype),
        )
        self.model.eval()
        self.load_seconds = time.time() - t0
        print(f"모델 준비 완료 ({self.load_seconds:.0f}초)")

    def judge(self, rule_id: str, text: str) -> dict:
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_prompt(rule_id, text)},
        ]
        input_ids = self.tokenizer.apply_chat_template(
            messages, add_generation_prompt=True, return_tensors="pt"
        )
        with self.torch.no_grad():
            output = self.model.generate(
                input_ids,
                max_new_tokens=128,
                do_sample=False,  # 같은 입력이면 같은 결과가 나오도록 확률 샘플링을 끈다
                pad_token_id=self.tokenizer.eos_token_id,
            )
        raw = self.tokenizer.decode(output[0][input_ids.shape[1]:], skip_special_tokens=True)
        return parse_answer(raw)


class MockJudge:
    """모델 없이 실행 흐름만 확인하는 가짜 판정기. 패턴 판정 결과를 그대로 돌려준다."""

    load_seconds = 0.0

    def judge(self, rule_id: str, text: str) -> dict:
        from pattern_judge import judge

        result = judge(rule_id, text)
        result["raw"] = "(mock)"
        return result


def parse_answer(raw: str) -> dict:
    """모델 출력에서 JSON을 꺼낸다. 형식이 깨져도 violation 값만은 최대한 읽어 낸다."""
    m = re.search(r"\{.*?\}", raw, re.S)
    if m:
        try:
            data = json.loads(m.group(0))
            return {
                "violation": bool(data.get("violation")),
                "reason": str(data.get("reason", "")),
                "suggestion": str(data.get("suggestion", "")),
                "raw": raw.strip(),
            }
        except json.JSONDecodeError:
            pass
    v = re.search(r'"?violation"?\s*:\s*(true|false)', raw, re.I)
    return {
        "violation": v is not None and v.group(1).lower() == "true",
        "reason": "(JSON 형식 오류 — violation 값만 추출)" if v else "(판정 실패 — 출력 해석 불가)",
        "suggestion": "",
        "raw": raw.strip(),
        "parse_error": True,
    }
