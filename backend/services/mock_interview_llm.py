# backend/services/mock_interview_llm.py

import logging
import json
from typing import Dict, Any, List

from services.llm_manager import run_llm
from services.prompts import (
    PROMPT_INTERVIEW_START,
    PROMPT_INTERVIEW_ANSWER,
    PROMPT_INTERVIEW_REPORT,
)
from services.services_utils import safe_json_load

logger = logging.getLogger("services.mock_interview_llm")


# ---------------------- START INTERVIEW ----------------------


async def generate_interview_start(vars_for_prompt: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calls LLM to design interviewer panel + warm greeting + first question.

    NOTE:
    - We do NOT use .format() on PROMPT_INTERVIEW_START because it contains
      JSON examples with braces {}. All variable replacement is done inside
      run_llm(prompt, variables=...).
    """
    # Keep prompt as-is; let run_llm inject {target_role}, etc.
    prompt = PROMPT_INTERVIEW_START

    # Safely call the LLM. If anything fails, run_llm returns "".
    raw = await run_llm(prompt, variables=vars_for_prompt)

    # Try to parse JSON; safe_json_load never raises, just returns {} on error
    data = safe_json_load(raw, mode="generic")
    if not isinstance(data, dict):
        data = {}

    interviewers = data.get("interviewers") or []
    if not isinstance(interviewers, list):
        interviewers = []

    # Fallback interviewer if LLM fails or does not return valid structure
    if not interviewers:
        interviewers = [
            {
                "name": "Dr. Evelyn Reed",
                "role": "Senior Software Engineer",
                "specialty": "Behavioral + Problem Solving",
                "style": "Warm but probing, like Google Interview Warmup.",
                "avatar": "A",
            }
        ]

    # Normalize interviewer fields
    normalized = []
    for idx, iv in enumerate(interviewers):
        if not isinstance(iv, dict):
            continue
        normalized.append(
            {
                "name": iv.get("name") or f"Interviewer {idx + 1}",
                "role": iv.get("role") or "Software Engineer",
                "specialty": iv.get("specialty") or "",
                "style": iv.get("style") or "",
                "avatar": iv.get("avatar") or "A",
            }
        )

    first_question = data.get("first_question") or "Tell me about yourself."
    session_brief = data.get("session_brief") or (
        "This session will warm up your interviewing skills with structured, "
        "Google-Interview-Warmup-style questions and feedback."
    )

    return {
        "interviewers": normalized,
        "first_question": first_question,
        "session_brief": session_brief,
    }


# ---------------------- PER-QUESTION ANSWER EVALUATION (P2) ----------------------


async def process_interview_answer(vars_for_prompt: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluates the current answer, returns:
      - feedback (summary / strengths / improvements / score)
      - next_question
      - should_continue
      - penalty_seconds, penalty_reason  (P2 dynamic penalty)

    Again, prompt contains JSON skeleton; we avoid .format() and pass variables
    into run_llm() instead.
    """
    prompt = PROMPT_INTERVIEW_ANSWER
    raw = await run_llm(prompt, variables=vars_for_prompt)

    data = safe_json_load(raw, mode="generic")
    if not isinstance(data, dict):
        data = {}

    feedback = data.get("feedback") or {}
    if not isinstance(feedback, dict):
        feedback = {}

    # Normalize feedback structure
    feedback.setdefault("summary", "")
    strengths = feedback.get("strengths") or []
    improvements = feedback.get("improvements") or []
    if isinstance(strengths, str):
        strengths = [s.strip() for s in strengths.split("\n") if s.strip()]
    if isinstance(improvements, str):
        improvements = [s.strip() for s in improvements.split("\n") if s.strip()]
    feedback["strengths"] = strengths
    feedback["improvements"] = improvements

    # Optional numeric score 1–10
    try:
        score = int(feedback.get("score") or 0)
    except Exception:
        score = 0
    feedback["score"] = max(0, min(10, score))

    next_question = data.get("next_question") or ""
    should_continue = bool(data.get("should_continue", False))

    control = data.get("control") or {}
    if not isinstance(control, dict):
        control = {}

    # Dynamic penalty from LLM (P2)
    try:
        penalty_seconds = int(control.get("penalty_seconds") or 0)
    except Exception:
        penalty_seconds = 0
    penalty_seconds = max(0, min(180, penalty_seconds))  # cap at 3 minutes/turn
    penalty_reason = str(control.get("penalty_reason") or "")

    return {
        "feedback": feedback,
        "next_question": next_question,
        "should_continue": should_continue,
        "penalty_seconds": penalty_seconds,
        "penalty_reason": penalty_reason,
    }


# ---------------------- FINAL REPORT ----------------------


async def generate_interview_report(
    questions: List[Dict[str, Any]],
    vars_for_prompt: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Summarizes the entire session into a structured final report (R1).
    """
    history_json = json.dumps(questions, ensure_ascii=False)
    merged_vars = dict(vars_for_prompt)
    merged_vars["history_json"] = history_json

    prompt = PROMPT_INTERVIEW_REPORT
    raw = await run_llm(prompt, variables=merged_vars)

    data = safe_json_load(raw, mode="generic")
    if not isinstance(data, dict):
        data = {}

    # Ensure R1 structure
    summary = data.get("summary") or {}
    if not isinstance(summary, dict):
        summary = {}
    summary.setdefault("overall_impression", "")
    summary.setdefault("hire_recommendation", "")
    summary.setdefault("strengths", [])
    summary.setdefault("areas_for_improvement", [])
    summary.setdefault("next_steps", [])

    data["summary"] = summary
    data.setdefault("question_level_feedback", questions)

    return data