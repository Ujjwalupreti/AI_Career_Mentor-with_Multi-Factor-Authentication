import io
import logging
import json
from typing import Dict, Any, List, Optional
from concurrent.futures import ThreadPoolExecutor
from PyPDF2 import PdfReader

from models import User, Skill, UserSkill
from services.prompts import PROMPT_PARSE, PROMPT_LINKEDIN_ANALYSIS
from services.llm_manager import run_llm
from services.services_utils import safe_json_load, validate_resume_json, validate_linkedin_json, ExperienceList
from services.recommendations import generate_experience_suggestions, generate_resume_improvement

logger = logging.getLogger("services.skill_extractions")
logger.setLevel(logging.INFO)
executor = ThreadPoolExecutor(max_workers=3)


def extract_text_from_bytes(content: bytes, filename: str) -> str:
    """Extract readable text from uploaded file bytes."""
    try:
        if filename.lower().endswith(".pdf"):
            reader = PdfReader(io.BytesIO(content))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        return content.decode("utf-8", errors="ignore")
    except Exception as e:
        logger.error(f"[extract_text_from_bytes] {e}")
        return ""


async def process_resume(
    user_id: int,
    file_bytes: Optional[bytes] = None,
    filename: Optional[str] = None,
    file_path: Optional[str] = None,
    model_pref: str = "auto",
) -> Dict[str, Any]:
    """Enhanced resume/LinkedIn parser with improvement insights."""
    text = ""
    if file_bytes:
        text = extract_text_from_bytes(file_bytes, filename or "resume.pdf")
    elif file_path:
        with open(file_path, "rb") as f:
            text = extract_text_from_bytes(f.read(), file_path)

    if not text.strip():
        return {"error": "Empty or unreadable file"}

    is_linkedin = any(k in text.lower() for k in ["linkedin.com/in", "endorsement", "top skills"])
    mode = "linkedin" if is_linkedin else "resume"
    prompt = PROMPT_LINKEDIN_ANALYSIS if is_linkedin else PROMPT_PARSE

    user = User.get_by_id(user_id) or {}
    current_role = user.get("current_role", "Professional")
    target_role = user.get("target_role", "Software Developer")

    try:
        output = await run_llm(
            prompt,
            variables={"text": text[:14000], "current_role": current_role, "target_role": target_role},
            preference=model_pref,
        )
        parsed = safe_json_load(output, mode=mode)
    except Exception as e:
        logger.exception(f"[process_resume] Parse failed: {e}")
        parsed = {}

    if mode == "linkedin":
        final_data = validate_linkedin_json(parsed)
    else:
        final_data = validate_resume_json(parsed)

        
        existing = final_data.get("experience", []) or []
        num_suggested = sum(1 for e in existing if str(e.get("source", "")).lower() == "suggested")
        if len(existing) < 2 or num_suggested < 2:
            try:
                titles = [p.get("title") for p in final_data.get("projects", []) or [] if p.get("title")]
                exp_gen = await generate_experience_suggestions(
                    target_role, final_data.get("skills", []), titles, model_pref=model_pref
                )
                if exp_gen:
                    for e in exp_gen:
                        if "source" not in e or not e["source"]:
                            e["source"] = "suggested"
                    merged = (existing or []) + (exp_gen or [])
                    seen, unique = set(), []
                    for e in merged:
                        key = (
                            (e.get("role") or "").strip().lower(),
                            (e.get("project_title") or "").strip().lower(),
                            (e.get("short_description") or "").strip().lower(),
                        )
                        if key in seen:
                            continue
                        seen.add(key)
                        unique.append(e)
                    final_data["experience"] = unique[:6]
            except Exception as e:
                logger.warning(f"[process_resume] experience gen failed: {e}")

        
        if not final_data.get("improvement_analysis"):
            try:
                improvements = await generate_resume_improvement(final_data, model_pref)
                if improvements:
                    final_data["improvement_analysis"] = improvements
            except Exception as e:
                logger.warning(f"[process_resume] improvement gen failed: {e}")

    final_data.update({
        "source": mode,
        "raw_excerpt": text[:1000],
        "user_current_role": current_role,
        "user_target_role": target_role,
    })
    logger.info(f"[process_resume] ✅ Completed for user {user_id} ({mode})")
    return final_data


def save_extracted_skills(user_id: int, skills: List[str], level: str = "Beginner"):
    """Save recognized user skills safely."""
    if not skills:
        return
    try:
        for s in skills:
            sid = Skill.get_or_create(s)
            UserSkill.create_or_update(user_id, sid, level)
        logger.info(f"[save_extracted_skills] Saved {len(skills)} skills for {user_id}.")
    except Exception as e:
        logger.error(f"[save_extracted_skills] DB error: {e}")