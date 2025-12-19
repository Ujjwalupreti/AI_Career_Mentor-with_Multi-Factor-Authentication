import json
import logging
import time
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field

from database import mysql_db
from routes.auth import get_current_user
from services.mock_interview_llm import (
    generate_interview_start,
    process_interview_answer,
    generate_interview_report,
)
from services.tts import google_tts

logger = logging.getLogger("routes.mock_interview")

router = APIRouter(tags=["mock_interview"])


class StartMockInterviewRequest(BaseModel):
    target_role: str = Field(..., example="Software Engineer")
    difficulty: str = Field("medium", pattern="^(easy|medium|hard)$")
    num_interviewers: int = Field(1, ge=1, le=3)
    duration_minutes: int = Field(20, ge=5, le=90)
    career_level: str = Field("Entry-level")
    present_skills: Optional[List[str]] = []
    missing_skills: Optional[List[str]] = []


class StartMockInterviewResponse(BaseModel):
    session_id: int
    session_brief: str
    interviewers: List[Dict[str, Any]]
    first_question: str
    duration_minutes: int
    remaining_seconds: int


class AnswerRequest(BaseModel):
    answer: str
    interviewer_name: Optional[str] = None
    elapsed_seconds: Optional[int] = 0
    skipped: bool = False  


class AnswerResponse(BaseModel):
    session_id: int
    feedback: Dict[str, Any]
    next_question: Optional[str]
    should_continue: bool
    rounds_completed: int
    remaining_seconds: int
    penalty_seconds: int = 0
    penalty_reason: str = ""


class TTSRequest(BaseModel):
    text: str



def load_mock_session(session_id: int, user_id: int) -> Dict[str, Any]:
    row = mysql_db.fetch_one(
        "SELECT * FROM mock_interview_sessions WHERE session_id=%s AND user_id=%s",
        (session_id, user_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")

    state = row.get("state_json") or {}

    
    if isinstance(state, str):
        try:
            state = json.loads(state)
            if isinstance(state, str):
                state = json.loads(state)
        except Exception:
            state = {}

    row["state_json"] = state
    return row


def save_mock_session(session_id: int, state: dict, status: str = "active") -> None:
    json_str = json.dumps(state, ensure_ascii=False)
    mysql_db.execute_query(
        """
        UPDATE mock_interview_sessions
        SET state_json=%s, status=%s, updated_at=NOW()
        WHERE session_id=%s
        """,
        (json_str, status, session_id),
    )



@router.post("/tts")
async def generate_question_audio(payload: TTSRequest):

    if not payload.text:
        return Response(content=b"", media_type="audio/mpeg")

    try:
        audio_bytes = await google_tts(payload.text)
        if not audio_bytes:
            return Response(status_code=204)
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except Exception as e:
        logger.error(f"[MockInterview] TTS Endpoint Error: {e}")
        return Response(status_code=500)



@router.post("/start", response_model=StartMockInterviewResponse)
async def start_mock_interview(
    payload: StartMockInterviewRequest,
    current_user=Depends(get_current_user),
):
    user_id = current_user["user_id"]
    logger.info(
        f"[MockInterview] Starting interview for user {user_id}: {payload.target_role}"
    )

    vars_for_prompt = {
        "target_role": payload.target_role,
        "career_level": payload.career_level,
        "difficulty": payload.difficulty,
        "num_interviewers": str(payload.num_interviewers),
        "present_skills": ", ".join(payload.present_skills or []),
        "missing_skills": ", ".join(payload.missing_skills or []),
    }

    
    try:
        result = await generate_interview_start(vars_for_prompt)
    except Exception as e:
        logger.error(f"[MockInterview] LLM Generation failed: {e}")
        raise HTTPException(
            status_code=500, detail="AI service unavailable for mock interview."
        )

    interviewers = result.get("interviewers", [])
    first_question = result.get("first_question", "Tell me about yourself.")
    session_brief = result.get("session_brief", "")

    started_at = int(time.time())
    duration_minutes = int(payload.duration_minutes)
    total_seconds = max(60, duration_minutes * 60)

    
    state: Dict[str, Any] = {
        "target_role": payload.target_role,
        "career_level": payload.career_level,
        "difficulty": payload.difficulty,
        "num_interviewers": payload.num_interviewers,
        "duration_minutes": duration_minutes,
        "interviewers": interviewers,
        "started_at": started_at,
        "round": 1,
        "max_rounds": max(3, duration_minutes // 3),
        "remaining_seconds": total_seconds,
        "questions": [
            {
                "interviewer_name": interviewers[0]["name"]
                if interviewers
                else "Interviewer",
                "question": first_question,
                "answer": "",
                "feedback": {},
            }
        ],
        "session_brief": session_brief,
    }

    
    try:
        json_state = json.dumps(state, ensure_ascii=False)
        with mysql_db.get_cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO mock_interview_sessions
                (user_id, target_role, difficulty, num_interviewers, duration_minutes, state_json, status)
                VALUES (%s, %s, %s, %s, %s, %s, 'active')
                """,
                (
                    user_id,
                    payload.target_role,
                    payload.difficulty,
                    payload.num_interviewers,
                    duration_minutes,
                    json_state,
                ),
            )
            session_id = cursor.lastrowid
            if not session_id:
                raise RuntimeError("Could not get session_id from cursor.lastrowid")
    except Exception as e:
        logger.error(f"[MockInterview] DB Insert failed: {e}")
        raise HTTPException(status_code=500, detail="Database Error")

    return StartMockInterviewResponse(
        session_id=session_id,
        session_brief=session_brief,
        interviewers=interviewers,
        first_question=first_question,
        duration_minutes=duration_minutes,
        remaining_seconds=total_seconds,
    )


@router.post("/{session_id}/answer", response_model=AnswerResponse)
async def answer_mock_interview(
    session_id: int,
    payload: AnswerRequest,
    current_user=Depends(get_current_user),
):
    user_id = current_user["user_id"]
    row = load_mock_session(session_id, user_id)
    state = row["state_json"]

    
    if row.get("status") == "completed":
        remaining = int(state.get("remaining_seconds", 0))
        return AnswerResponse(
            session_id=session_id,
            feedback={"summary": "Interview already completed."},
            next_question=None,
            should_continue=False,
            rounds_completed=int(state.get("round", 0)),
            remaining_seconds=remaining,
            penalty_seconds=0,
            penalty_reason="",
        )

    questions = state.get("questions", [])
    if not questions:
        questions = []
        state["questions"] = questions

    
    if questions:
        questions[-1]["answer"] = payload.answer

    
    elapsed = payload.elapsed_seconds or 0
    remaining = int(
        state.get("remaining_seconds", state.get("duration_minutes", 20) * 60)
    )
    remaining = max(0, remaining - max(0, elapsed))
    state["remaining_seconds"] = remaining

    round_idx = int(state.get("round", 1))
    max_rounds = int(state.get("max_rounds", 5))

    
    save_mock_session(session_id, state, status="active")

    
    current_q_text = questions[-1]["question"] if questions else "Intro"
    interviewer_name = (
        questions[-1].get("interviewer_name", "Interviewer")
        if questions
        else "Interviewer"
    )

    vars_for_prompt = {
        "target_role": state.get("target_role"),
        "career_level": state.get("career_level"),
        "difficulty": state.get("difficulty"),
        "num_interviewers": str(state.get("num_interviewers")),
        "interviewers_json": json.dumps(
            state.get("interviewers", []), ensure_ascii=False
        ),
        "history_json": json.dumps(questions, ensure_ascii=False),
        "interviewer_name": payload.interviewer_name or interviewer_name,
        "question": current_q_text,
        "answer": payload.answer,
        "round": round_idx,
        "max_rounds": max_rounds,
        "remaining_seconds": remaining,
        "duration_minutes": state.get("duration_minutes", 20),
        "skipped": payload.skipped,
    }

    
    llm_result = await process_interview_answer(vars_for_prompt)
    feedback = llm_result.get("feedback", {}) or {}
    next_question = llm_result.get("next_question") or ""
    llm_continue = bool(llm_result.get("should_continue", False))

    penalty_seconds = int(llm_result.get("penalty_seconds") or 0)
    penalty_reason = str(llm_result.get("penalty_reason") or "")
    penalty_seconds = max(0, min(180, penalty_seconds))

    
    if penalty_seconds > 0:
        remaining = max(0, remaining - penalty_seconds)
        state["remaining_seconds"] = remaining

    
    if questions:
        questions[-1]["feedback"] = feedback

    
    should_continue = llm_continue and remaining > 0 and round_idx < max_rounds

    if should_continue and next_question:
        
        state["round"] = round_idx + 1

        next_interviewer_idx = (
            (round_idx) % state.get("num_interviewers", 1)
            if state.get("num_interviewers", 1) > 0
            else 0
        )
        panel = state.get("interviewers", [])
        next_interviewer = (
            panel[next_interviewer_idx]
            if 0 <= next_interviewer_idx < len(panel)
            else {"name": "Interviewer"}
        )

        questions.append(
            {
                "interviewer_name": next_interviewer.get("name", "Interviewer"),
                "question": next_question,
                "answer": "",
                "feedback": {},
            }
        )
        save_mock_session(session_id, state, status="active")
    else:
        
        save_mock_session(session_id, state, status="completed")

    return AnswerResponse(
        session_id=session_id,
        feedback=feedback,
        next_question=next_question if should_continue else None,
        should_continue=should_continue,
        rounds_completed=int(state.get("round", round_idx)),
        remaining_seconds=remaining,
        penalty_seconds=penalty_seconds,
        penalty_reason=penalty_reason,
    )



@router.get("/{session_id}/report")
async def get_mock_interview_report(
    session_id: int,
    current_user=Depends(get_current_user),
):
    user_id = current_user["user_id"]
    row = load_mock_session(session_id, user_id)
    state = row["state_json"]

    
    if state.get("final_report"):
        return {"report": state["final_report"]}

    questions = state.get("questions", [])

    vars_for_prompt = {
        "target_role": state.get("target_role"),
        "career_level": state.get("career_level"),
        "difficulty": state.get("difficulty"),
        "num_interviewers": str(state.get("num_interviewers")),
        "interviewers_json": json.dumps(
            state.get("interviewers", []), ensure_ascii=False
        ),
    }

    try:
        report = await generate_interview_report(questions, vars_for_prompt)
        state["final_report"] = report
        save_mock_session(session_id, state, status="completed")
        return {"report": report}
    except Exception as e:
        logger.error(f"[MockInterview] Report generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate report")



@router.get("/history")
async def get_mock_interview_history(current_user=Depends(get_current_user)):
    user_id = current_user["user_id"]
    rows = mysql_db.fetch_all(
        "SELECT * FROM mock_interview_sessions WHERE user_id=%s "
        "ORDER BY updated_at DESC LIMIT 20",
        (user_id,),
    )

    history: List[Dict[str, Any]] = []
    for r in rows:
        state = r.get("state_json")
        if isinstance(state, str):
            try:
                state = json.loads(state)
                if isinstance(state, str):
                    state = json.loads(state)
            except Exception:
                state = {}
        state = state or {}
        report = state.get("final_report") or {}
        summary = report.get("summary", {})

        history.append(
            {
                "session_id": r["session_id"],
                "target_role": r["target_role"],
                "difficulty": r["difficulty"],
                "num_interviewers": r["num_interviewers"],
                "duration_minutes": r["duration_minutes"],
                "status": r["status"],
                "updated_at": str(r["updated_at"]),
                "summary": summary.get(
                    "overall_impression", "No summary available."
                ),
                "hire_recommendation": summary.get("hire_recommendation", ""),
            }
        )

    return {"sessions": history}


@router.delete("/{session_id}")
async def delete_mock_session(
    session_id: int,
    current_user=Depends(get_current_user),
):
    user_id = current_user["user_id"]
    try:
        row = mysql_db.fetch_one(
            "SELECT session_id FROM mock_interview_sessions "
            "WHERE session_id=%s AND user_id=%s",
            (session_id, user_id),
        )
        if not row:
            raise HTTPException(
                status_code=404, detail="Session not found or unauthorized"
            )

        mysql_db.execute_query(
            "DELETE FROM mock_interview_sessions WHERE session_id=%s AND user_id=%s",
            (session_id, user_id),
        )
        logger.info(f"[MockInterview] Deleted session {session_id} for user {user_id}")
        return {"status": "deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[MockInterview] Delete failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete session")