from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, Dict
import logging

from routes.auth import get_current_user
from models import Skill, UserSkill
from services.llm_manager import run_llm

logger = logging.getLogger("routes.skills")
router = APIRouter(tags=["Skills"])


class AddSkillRequest(BaseModel):
    skill_name: str
    level: Optional[str] = "Beginner"


@router.get("/list")
async def list_skills(current_user: Dict = Depends(get_current_user)):
    """Return all user skills and proficiency."""
    try:
        
        skills = UserSkill.get_by_user(current_user["user_id"])
        return {"skills": skills}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch skills: {e}")

@router.get("/recommend")
async def recommend_skills(
    role: str = Query(...),
    model_pref: str = Query("auto"),
    current_user: Dict = Depends(get_current_user),
):
    """Suggest new skills for a target role using LLM."""
    prompt = f"List the top 10 essential technical and soft skills for a {role}. Output as JSON list only."
    try:
        
        result = await run_llm(prompt, preference=model_pref)
        return {"recommended_skills": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM error: {e}")

@router.get("/dashboard")

async def skill_dashboard(target_role: Optional[str] = Query(None), model_pref: Optional[str] = Query("auto"),
                    current_user: dict = Depends(get_current_user)):
    """Show user’s skill strengths and improvement suggestions."""
    try:
        skills = UserSkill.get_by_user(current_user["user_id"])
        all_skills = [s["skill_name"] for s in skills]
        prompt = f"""
You are an expert skill coach. 
Analyze this user's skill set: {all_skills}
Target Role: {target_role}
Suggest which skills to improve, remove, or learn next. 
Return only JSON as:
{{"strengths": [], "to_improve": [], "recommended": []}}
"""
        
        out = await run_llm(prompt, preference=model_pref)
        return {"dashboard": out}
    except Exception as e:
        logger.exception(f"[skill_dashboard] {e}")
        raise HTTPException(status_code=500, detail="Failed to generate dashboard")