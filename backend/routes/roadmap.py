from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import logging, json

from database import get_db
from routes.auth import get_current_user
from models import Roadmap, RoadmapStep, Resume, User
from services.roadmap_generate import generate_roadmap

router = APIRouter(tags=["Roadmap"])
logger = logging.getLogger("routes.roadmap")
mysql_db = get_db()


class GenerateRoadmapRequest(BaseModel):
    target_role: str
    timeline_months: Optional[int] = 6
    career_level: Optional[str] = "Entry-level"
    model_pref: Optional[str] = "auto"
    location: Optional[str] = None  
    resume_id: Optional[int] = None 


class UpdateRoadmapContentRequest(BaseModel):
    roadmap_json: dict
    completion_percentage: float


@router.post("/generate")
async def generate_user_roadmap(payload: GenerateRoadmapRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    
    try:
        
        parsed_resume = None
        if payload.resume_id:
            
            resume_record = Resume.get_by_id(payload.resume_id)
            if resume_record and resume_record["user_id"] == user_id:
                parsed_resume = resume_record.get("parsed_json")
                
                if isinstance(parsed_resume, str):
                    parsed_resume = json.loads(parsed_resume)
            else:
                logger.warning(f"User {user_id} requested invalid resume {payload.resume_id}")
        
        
        if not parsed_resume:
            latest_resume = Resume.get_latest(user_id)
            parsed_resume = latest_resume.get("parsed_json") if latest_resume else None

        
        final_location = payload.location
        if not final_location:
            
            full_user = User.get_by_id(user_id)
            final_location = full_user.get("location")
        
        
        roadmap_data = await generate_roadmap(
            user_id=user_id,
            target_role=payload.target_role,
            timeline_months=payload.timeline_months,
            parsed_resume=parsed_resume,
            model_pref=payload.model_pref,
            career_level=payload.career_level,
            location=final_location  
        )

        start_date = datetime.now().date()
        end_date = (datetime.now() + timedelta(days=payload.timeline_months * 30)).date()
        roadmap_id = Roadmap.create(user_id, payload.target_role, start_date, end_date, 0.0)
        
        
        RoadmapStep.create_full_roadmap(roadmap_id, roadmap_data)

        return {"roadmap_id": roadmap_id, "roadmap": roadmap_data}

    except Exception as e:
        logger.exception(f"[generate_user_roadmap] {e}")
        raise HTTPException(status_code=500, detail=f"Roadmap generation failed: {str(e)}")

@router.get("/list")
def list_user_roadmaps(current_user: dict = Depends(get_current_user)):
    try:
        roadmaps = Roadmap.get_by_user(current_user["user_id"])
        enriched = []

        for r in roadmaps:
            steps = RoadmapStep.get_by_roadmap(r["roadmap_id"])
            overview = {}
            if steps and isinstance(steps, dict):
                overview = steps.get("overview", {})
            enriched.append({
                **r,
                "overview_summary": overview.get("overview_summary"),
                "difficulty_level": overview.get("difficulty_level"),
                "duration_total": overview.get("duration_total"),
            })

        return {"roadmaps": enriched}
    except Exception as e:
        logger.error(f"[list_user_roadmaps] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch roadmaps")

@router.get("/{roadmap_id}")
def get_roadmap_detail(roadmap_id: int, current_user: dict = Depends(get_current_user)):
    try:
        roadmap_meta = Roadmap.get_by_id(roadmap_id, current_user["user_id"])
        roadmap_json = RoadmapStep.get_by_roadmap(roadmap_id)

        
        roadmap = {**roadmap_json, **roadmap_meta}
        return roadmap
    except Exception as e:
        logger.error(f"[get_roadmap_detail] {e}")
        raise HTTPException(status_code=500, detail="Failed to load roadmap")


@router.put("/progress/{roadmap_id}/{percent}")
def update_roadmap_progress(roadmap_id: int, percent: float, current_user: dict = Depends(get_current_user)):
    try:
        Roadmap.update_progress(roadmap_id, percent)
        return {"message": "Progress updated"}
    except Exception as e:
        logger.error(f"[update_roadmap_progress] {e}")
        raise HTTPException(status_code=500, detail="Failed to update progress")


@router.delete("/{roadmap_id}")
def delete_roadmap(roadmap_id: int, current_user: dict = Depends(get_current_user)):
    try:
        Roadmap.delete(roadmap_id, current_user["user_id"])
        return {"message": "Roadmap deleted successfully"}
    except Exception as e:
        logger.error(f"[delete_roadmap] {e}")
        raise HTTPException(status_code=500, detail="Failed to delete roadmap")
    

@router.put("/{roadmap_id}/update_content")
def update_roadmap_content(
    roadmap_id: int, 
    payload: UpdateRoadmapContentRequest, 
    current_user: dict = Depends(get_current_user)
):
    try:
        RoadmapStep.update_content(roadmap_id, payload.roadmap_json)
        Roadmap.update_progress(roadmap_id, payload.completion_percentage)
        
        return {"message": "Roadmap updated successfully"}
    except Exception as e:
        logger.error(f"[update_roadmap_content] {e}")
        raise HTTPException(status_code=500, detail="Failed to update roadmap")    