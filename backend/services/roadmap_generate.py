
import json
import asyncio
import logging
import urllib.parse
import re
from typing import Dict, List, Any, Optional
from youtubesearchpython import VideosSearch, PlaylistsSearch

from services.prompts import (
    PROMPT_ROADMAP_OVERVIEW,
    PROMPT_ROADMAP_CURRICULUM,
    PROMPT_ROADMAP_SKILLS,
    PROMPT_ROADMAP_NETWORKING,
)
from database import mysql_db
from services.llm_manager import run_llm
from services.services_utils import safe_json_load, fetch_real_jobs, match_jobs_bulk

logger = logging.getLogger("services.roadmap_generate")
logger.setLevel(logging.INFO)


def parse_duration_seconds(duration_str: str) -> int:
    if not duration_str:
        return 0
    parts = list(map(int, duration_str.split(':')))
    if len(parts) == 1:
        return parts[0]
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    if len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    return 0

MIN_VIDEO_SECONDS = 30 * 60
MIN_PLAYLIST_ITEMS = 4


async def fetch_top_video(query: str) -> str:
    """
    Return a direct embed link (youtube embed) if possible.
    Prefer long videos >= MIN_VIDEO_SECONDS. If none, attempt playlist.
    If nothing found, fall back to site-specific reliable resources:
     - GitHub search for 'project' titles
     - Official docs search (google result) as last fallback
    """
    try:
        data = await asyncio.to_thread(lambda: VideosSearch(query + " full course", limit=12).result())
        candidates = (data or {}).get("result", []) or []
        best = None
        for vid in candidates:
            dur = vid.get("duration")
            sec = parse_duration_seconds(dur)
            if sec >= MIN_VIDEO_SECONDS:
                best = vid
                break
        if not best and candidates:
            
            best = max(candidates, key=lambda v: parse_duration_seconds(v.get("duration") or "0:00"))
        if best:
            vid_id = best.get("id")
            if vid_id:
                return f"https://www.youtube.com/embed/{vid_id}"
    except Exception as e:
        logger.warning(f"[fetch_top_video] search failed for '{query}': {e}")

    
    pl = await fetch_top_playlist(query + " playlist full course")
    if pl:
        return pl

    
    return f"https://github.com/search?q={urllib.parse.quote(query)}&type=repositories"


async def fetch_top_playlist(query: str) -> str:
    try:
        data = await asyncio.to_thread(lambda: PlaylistsSearch(query, limit=6).result())
        results = (data or {}).get("result", []) or []
        for pl in results:
            count = pl.get("count") or pl.get("videoCount") or pl.get("videos") or 0
            try:
                cnt = int(count) if count is not None else 0
            except Exception:
                cnt = 0
            if cnt >= MIN_PLAYLIST_ITEMS:
                pid = pl.get("id")
                if pid:
                    return f"https://www.youtube.com/playlist?list={pid}"
        
        if results:
            pid = results[0].get("id")
            if pid:
                return f"https://www.youtube.com/playlist?list={pid}"
    except Exception as e:
        logger.warning(f"[fetch_top_playlist] failed for '{query}': {e}")
    return ""


async def fetch_resource_by_type(query: str, r_type: str) -> str:
    """
    FIXED VERSION — NO GOOGLE SEARCH LINKS
    """
    q = urllib.parse.quote(query)

    
    if r_type in ("Playlist", "Course"):
        pl = await fetch_top_playlist(query)
        if pl:
            return pl

        vid = await fetch_top_video(query)
        if vid:
            return vid

        return f"https://github.com/search?q={q}&type=repositories"

    
    if r_type == "Video":
        vid = await fetch_top_video(query)
        if vid:
            return vid
        return f"https://github.com/search?q={q}&type=repositories"

    
    if r_type == "Project":
        return f"https://github.com/search?q={q}&type=repositories"

    
    if r_type == "Docs":
        lower = query.lower()

        if "python" in lower:
            return "https://docs.python.org/3/"

        if "sql" in lower or "mysql" in lower or "postgres" in lower:
            return "https://dev.mysql.com/doc/"

        if "react" in lower:
            return "https://react.dev/learn"

        if "node" in lower or "express" in lower:
            return "https://nodejs.org/en/docs"

        if "html" in lower:
            return "https://developer.mozilla.org/en-US/docs/Web/HTML"

        if "css" in lower:
            return "https://developer.mozilla.org/en-US/docs/Web/CSS"

        if "javascript" in lower or "js" in lower:
            return "https://developer.mozilla.org/en-US/docs/Web/JavaScript"

        return "https://developer.mozilla.org/"

    if r_type == "Article":
        return f"https://medium.com/search?q={q}"

    return f"https://github.com/search?q={q}&type=repositories"

async def enrich_curriculum_with_real_videos(curriculum: List[Dict], target_role: str) -> List[Dict]:
    tasks = []
    mapping = []

    for phase in curriculum:
        if not isinstance(phase, dict):
            continue
        for topic in phase.get("topics", []):
            if not isinstance(topic, dict):
                continue
            for resource in topic.get("resources", []):
                r_type = (resource.get("type") or "Article").title()
                if resource.get("url"):
                    
                    u = resource.get("url") or ""
                    if "youtube.com/results" in u or "google.com/search" in u:
                        
                        pass
                    else:
                        continue
                title = resource.get("title") or ""
                search_query = " ".join(p for p in [target_role, topic.get("title",""), title] if p)[:200]
                tasks.append(fetch_resource_by_type(search_query, r_type))
                mapping.append(resource)

    if not tasks:
        return curriculum

    results = await asyncio.gather(*tasks, return_exceptions=True)
    for i, res in enumerate(results):
        resource_obj = mapping[i]
        if isinstance(res, Exception) or not res:
            
            resource_obj["url"] = f"https://github.com/search?q={urllib.parse.quote(resource_obj.get('title') or '')}"
        else:
            resource_obj["url"] = res

    return curriculum


def generate_networking_links(networking_list: List[Dict], target_role: str, location: str = None) -> List[Dict]:
    if not networking_list:
        return []
    loc_enc = urllib.parse.quote(location or "")
    role_enc = urllib.parse.quote(target_role or "")
    out = []
    for item in networking_list[:4]:
        platform = (item.get("platform") or "").lower()
        advice = item.get("advice") or item.get("reason") or ""
        if "linkedin" in platform:
            link = f"https://www.linkedin.com/search/results/groups/?keywords={role_enc}%20{loc_enc}" if location else f"https://www.linkedin.com/search/results/groups/?keywords={role_enc}"
            out.append({**item, "resource_link": link, "platform": "LinkedIn", "advice": advice})
        elif "meetup" in platform:
            link = f"https://www.meetup.com/find/events/?allMeetups=true&keywords={role_enc}&location={loc_enc}" if location else f"https://www.meetup.com/find/events/?keywords={role_enc}"
            out.append({**item, "resource_link": link, "platform": "Meetup", "advice": advice})
        elif "github" in platform:
            slug = re.sub(r"[^\w\-]+", "-", target_role.strip().lower())
            link = f"https://github.com/topics/{slug}"
            extra = f"https://github.com/search?q={role_enc}&type=users"
            out.append({**item, "resource_link": link, "extra_links": [extra], "platform": "GitHub", "advice": advice})
        elif "discord" in platform:
            link = f"https://discord.com/discover?q={role_enc}"
            out.append({**item, "resource_link": link, "platform": "Discord", "advice": advice})
        else:
            link = f"https://www.google.com/search?q={urllib.parse.quote(target_role + ' communities ' + (location or ''))}"
            out.append({**item, "resource_link": link, "platform": item.get("platform") or "Community", "advice": advice})
    return out


def get_user_skills(user_id: int) -> Dict[str, List[str]]:
    mastered, intermediate, beginner = [], [], []
    try:
        rows = mysql_db.fetch_all("SELECT s.skill_name, us.level FROM USER_SKILLS us JOIN SKILLS s USING (skill_id) WHERE us.user_id=%s", (user_id,))
        for r in rows:
            level, name = (r.get("level") or "").lower(), (r.get("skill_name") or "").strip()
            if not name:
                continue
            if level in ("expert", "advanced"):
                mastered.append(name)
            elif level == "intermediate":
                intermediate.append(name)
            else:
                beginner.append(name)
    except Exception:
        pass
    return {"mastered": mastered, "intermediate": intermediate, "beginner": beginner}


async def generate_roadmap(
    user_id: int, target_role: str, timeline_months: int = 6,
    parsed_resume: Optional[Dict[str, Any]] = None, model_pref: str = "auto",
    career_level: Optional[str] = "Entry-level", location: Optional[str] = None
) -> Dict[str, Any]:

    parsed_resume = parsed_resume or {}
    resume_skills = parsed_resume.get("skills") or []
    if not resume_skills:
        db_skills = get_user_skills(user_id)
        resume_skills = db_skills["mastered"] + db_skills["intermediate"] + db_skills["beginner"]
        parsed_resume["skills"] = resume_skills

    base_vars = {
        "target_role": target_role,
        "career_level": career_level,
        "timeline_months": timeline_months,
        "present_skills": ", ".join(resume_skills[:40]),
        "missing_skills": ", ".join((parsed_resume.get("missing_skills") or [])[:15]),
        "learning_style": "Project-based",
        "personality": "Visual Learner",
        "location": location or ""
    }

    logger.info(f"[generate_roadmap] Role: {target_role} Location: {location}")

    try:
        job_query = f"{target_role} in {location}" if location else target_role

        
        overview_task = run_llm(PROMPT_ROADMAP_OVERVIEW, variables=base_vars, preference=model_pref)
        curriculum_task = run_llm(PROMPT_ROADMAP_CURRICULUM, variables=base_vars, preference=model_pref)
        job_task = fetch_real_jobs(query=job_query, limit=8, location=location)

        overview_raw, curriculum_raw, jobs_raw = await asyncio.gather(overview_task, curriculum_task, job_task)

        overview = safe_json_load(overview_raw, mode="roadmap")
        curriculum_data = safe_json_load(curriculum_raw, mode="roadmap")

        curriculum = []
        if isinstance(curriculum_data, list):
            curriculum = curriculum_data
        elif isinstance(curriculum_data, dict):
            curriculum = curriculum_data.get("curriculum") or curriculum_data.get("phases") or []

        
        if curriculum:
            try:
                curriculum = await enrich_curriculum_with_real_videos(curriculum, target_role)
            except Exception as e:
                logger.error(f"[generate_roadmap] Enrichment failed: {e}")

        
        topics_list = []
        for p in curriculum:
            if isinstance(p, dict):
                for t in p.get("topics", []):
                    val = t.get("title") if isinstance(t, dict) else t
                    if val:
                        topics_list.append(val)

        skill_vars = {**base_vars, "curriculum_topics": ", ".join(topics_list[:10])}

        skills_task = run_llm(PROMPT_ROADMAP_SKILLS, variables=skill_vars, preference=model_pref)
        net_task = run_llm(PROMPT_ROADMAP_NETWORKING, variables=base_vars, preference=model_pref)

        skills_raw, net_raw = await asyncio.gather(skills_task, net_task)

        final_jobs = jobs_raw or []
        if final_jobs:
            try:
                final_jobs = match_jobs_bulk(final_jobs, parsed_resume)
            except Exception:
                logger.warning("[generate_roadmap] job matching failed, returning jobs raw")

        net_data = safe_json_load(net_raw)
        networking_list = net_data if isinstance(net_data, list) else net_data.get("networking", [])

        networking_list = generate_networking_links(networking_list, target_role, location)

        roadmap = {
            "metadata": base_vars,
            "overview": overview or {},
            "curriculum": curriculum or [],
            "skills": safe_json_load(skills_raw) or {},
            "related_jobs": final_jobs or [],
            "networking": networking_list or [],
        }

        logger.info("[generate_roadmap] ✅ Success")
        return roadmap

    except Exception as e:
        logger.exception(f"[generate_roadmap] Failed: {e}")
        return {"error": str(e), "metadata": base_vars}