
import json
import re
import urllib.parse
import time
import logging
import ast
from typing import Any, List, Optional, Dict
from pydantic import BaseModel, ValidationError, field_validator,Field
import httpx
from config import settings
from fastapi import HTTPException
from database import mysql_db

logger = logging.getLogger("services.services_utils")
logger.setLevel(logging.INFO)





_MODEL_COOLDOWN: Dict[str, float] = {}
_DEFAULT_COOLDOWN = 600  


def set_model_cooldown(model_name: str, seconds: int = _DEFAULT_COOLDOWN):
    expiry = time.time() + seconds
    _MODEL_COOLDOWN[model_name] = expiry
    logger.warning(f"[COOLDOWN] {model_name} unavailable until {time.ctime(expiry)}")


def is_model_on_cooldown(model_name: str) -> bool:
    expiry = _MODEL_COOLDOWN.get(model_name)
    if not expiry:
        return False
    if expiry > time.time():
        return True
    _MODEL_COOLDOWN.pop(model_name, None)
    return False






JUNK_FILTER_KEYWORDS = [
    "volunteer", "donation", "ngo", "call for papers",
    "teacher", "principal", "receptionist", "driver",
    "senior citizen", "old age", "blood camp"
]


async def _call_jsearch(query: str, location: Optional[str], timeout: int = 12) -> Dict:
    headers = {
        "X-RapidAPI-Key": settings.JSEARCH_RAPIDAPI_KEY,
        "X-RapidAPI-Host": settings.JSEARCH_RAPIDAPI_HOST,
    }
    params = {"query": query, "num_pages": 1}
    if location:
        params["location"] = location
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.get(f"https://{settings.JSEARCH_RAPIDAPI_HOST}/search", headers=headers, params=params)
        resp.raise_for_status()
        return resp.json()


async def fetch_real_jobs(query: str, limit: int = 10, location: str = None) -> List[Dict]:
  
    import urllib.parse
    import httpx
    from config import settings

    def extract_salary(item):
        try:
            highlights = item.get("job_highlights", {})
            salary_list = highlights.get("Salary") or []
            if isinstance(salary_list, list) and salary_list:
                return salary_list[0]
        except:
            pass

        direct = item.get("job_salary_info")
        if isinstance(direct, str) and direct.strip():
            return direct

        try:
            min_sal = item.get("job_min_salary")
            max_sal = item.get("job_max_salary")
            if min_sal or max_sal:
                return f"{min_sal or ''} - {max_sal or ''}".strip()
        except:
            pass

        return "Not Provided"

    api_key = settings.JSEARCH_RAPIDAPI_KEY
    api_host = settings.JSEARCH_RAPIDAPI_HOST

    if not api_key or not api_host:
        fallback_url = f"https://www.linkedin.com/jobs/search/?keywords={urllib.parse.quote(query)}"
        return [{
            "role": query,
            "company": "Various",
            "location": location or "Remote",
            "salary_range": "Not Provided",
            "description": f"View job listings for {query} on LinkedIn.",
            "job_portal_link": fallback_url,
            "posted_date": "N/A"
        }]

    try:
        headers = {
            "X-RapidAPI-Key": api_key,
            "X-RapidAPI-Host": api_host
        }

        params = {"query": query, "num_pages": 1}
        if location:
            params["location"] = location

        async with httpx.AsyncClient(timeout=12) as client:
            resp = await client.get(f"https://{api_host}/search", headers=headers, params=params)
            resp.raise_for_status()
            data = resp.json()

    except Exception as e:
        fallback_url = f"https://www.linkedin.com/jobs/search/?keywords={urllib.parse.quote(query)}"
        return [{
            "role": query,
            "company": "Various",
            "location": location or "Remote",
            "salary_range": "Not Provided",
            "description": f"Job results for {query} unavailable. Showing LinkedIn fallback link.",
            "job_portal_link": fallback_url,
            "posted_date": "N/A"
        }]

    items = data.get("data") or []
    jobs = []

    for item in items[:limit * 2]:
        title = item.get("job_title") or item.get("title")
        company = item.get("employer_name") or item.get("company")
        if not title or not company:
            continue

        job_url = item.get("job_apply_link") or item.get("job_google_link") or ""
        posted = item.get("job_posted_at") or item.get("job_date") or ""
        location_final = item.get("job_city") or item.get("job_location") or (location or "N/A")

        salary_cleaned = extract_salary(item)

        desc = item.get("job_description") or ""
        desc_clean = " ".join(desc.split())  
        desc_short = desc_clean[:450] + ("..." if len(desc_clean) > 450 else "")

        jobs.append({
            "role": title,
            "company": company,
            "location": location_final,
            "salary_range": salary_cleaned,
            "description": desc_short,
            "posted_date": posted,
            "job_portal_link": job_url
        })

        if len(jobs) >= limit:
            break

    if not jobs:
        fallback_url = f"https://www.linkedin.com/jobs/search/?keywords={urllib.parse.quote(query)}"
        return [{
            "role": query,
            "company": "Various",
            "location": location or "Remote",
            "salary_range": "Not Provided",
            "description": f"No results found via API. View LinkedIn listings.",
            "job_portal_link": fallback_url,
            "posted_date": "N/A"
        }]

    return jobs


def _build_job_search_url(query: str, location: Optional[str]):
    q = f"{query} {location}" if location else query
    qenc = re.sub(r"\s+", "+", q.strip())
    return f"https://www.linkedin.com/jobs/search/?keywords={qenc}"





def repair_json(json_str: str) -> str:
    json_str = (json_str or "").strip()
    if not json_str:
        return "{}"

    stack = []
    is_str = False
    escaped = False
    out = []

    for ch in json_str:
        out.append(ch)
        if ch == '"' and not escaped:
            is_str = not is_str
        if ch == "\\":
            escaped = not escaped
        else:
            escaped = False
        if not is_str:
            if ch == "{":
                stack.append("}")
            elif ch == "[":
                stack.append("]")
            elif ch in ("}", "]"):
                if stack and stack[-1] == ch:
                    stack.pop()

    if is_str:
        out.append('"')
    while stack:
        out.append(stack.pop())

    return "".join(out)


def safe_json_load(data: Any, mode: str = "generic"):
    defaults = {
        "generic": {},
        "roadmap": {
            "overview": {},
            "curriculum": [],
            "skills": {},
            "related_jobs": [],
            "networking": [],
        },
        "linkedin": {
            "summary": {},
            "headline_analysis": {},
            "about_section_analysis": {},
            "skills_analysis": {},
            "career_alignment": {},
            "action_items": [],
            "profile_keywords": {},
            "section_scores": {},
        }
    }

    if not data:
        return defaults.get(mode, {})

    if not isinstance(data, str):
        return data

    text = data.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"```$", "", text)

    start_json = min([i for i in [text.find("{"), text.find("[")] if i != -1], default=-1)
    if start_json != -1:
        end_json = max(text.rfind("}"), text.rfind("]"))
        if end_json != -1:
            text = text[start_json:end_json + 1]

    try:
        return json.loads(text)
    except Exception:
        pass

    try:
        return json.loads(repair_json(text))
    except Exception:
        pass

    try:
        return ast.literal_eval(text)
    except Exception:
        pass

    try:
        cleaned = text
        cleaned = re.sub(r"//.*?\n|/\*.*?\*/", "", cleaned)
        cleaned = re.sub(r'([{,]\s*)(\w+)(\s*:)', r'\1"\2"\3', cleaned)
        cleaned = re.sub(r",\s*([}\]])", r"\1", cleaned)
        return json.loads(repair_json(cleaned))
    except Exception:
        pass

    logger.error(f"[safe_json_load] Failed to parse mode={mode}. Returning defaults.")
    return defaults.get(mode, {})






class ExperienceItem(BaseModel):
    title: str
    company: Optional[str] = ""
    duration: Optional[str] = ""
    description: Optional[str] = ""

    @field_validator("*")
    def clean_fields(cls, v):
        return (v or "").strip()


class ExperienceList(BaseModel):
    experiences: List[ExperienceItem]


class ProjectItem(BaseModel):
    title: str
    description: Optional[str] = ""
    tech_stack: List[str] = []

    @field_validator("*")
    def clean_fields(cls, v):
        if isinstance(v, list):
            return [str(x).strip() for x in v]
        return (v or "").strip()


class ResumeParsed(BaseModel):
    summary: Dict = {}
    education: List[Dict] = []
    experience: List[ExperienceItem] = []
    projects: List[ProjectItem] = []
    skills: List[str] = []
    missing_skills: List[str] = []

    @field_validator("skills", "missing_skills", mode="before")
    def listify(cls, v):
        if isinstance(v, list):
            return [str(x).strip() for x in v]
        if isinstance(v, str):
            return [s.strip() for s in v.split(",") if s.strip()]
        return []


class LinkedInParsed(BaseModel):
    summary: Dict = {}
    headline_analysis: Dict = {}
    about_section_analysis: Dict = {}
    skills_analysis: Dict = {}
    career_alignment: Dict = {}
    action_items: List[str] = []
    profile_keywords: Dict = {}
    section_scores: Dict = {}


def validate_resume_json(data: Dict) -> Dict:
    try:
        return ResumeParsed(**data).model_dump()
    except ValidationError:
        logger.warning("[validate_resume_json] Resume structure invalid — returning partial.")
        return data


def validate_linkedin_json(data: Dict) -> Dict:
    try:
        return LinkedInParsed(**data).model_dump()
    except ValidationError:
        logger.warning("[validate_linkedin_json] LinkedIn structure invalid — returning partial.")
        return data






def _tok(text: str) -> List[str]:
    if not text:
        return []
    return re.findall(r"[a-zA-Z0-9\-\+\.#]+", text.lower())


def match_job(job: Dict, resume: Dict) -> Dict:
    desc = f"{job.get('role','')} {job.get('company','')} {job.get('location','')}".lower()
    job_tokens = set(_tok(desc))

    skills = resume.get("skills") or []
    if isinstance(skills, dict):
        skills = skills.get("present_skills") or []
    skills = [s.lower() for s in skills]

    matched = [s for s in skills if s in job_tokens]
    missing = [s for s in skills if s not in job_tokens]

    score = 0
    if skills:
        score = round(len(matched) / len(skills) * 100, 2)

    job["matched_skills"] = matched
    job["missing_skills"] = missing
    job["match_percent"] = score

    
    if "job_portal_link" not in job and job.get("url"):
        job["job_portal_link"] = job["url"]

    return job


def match_jobs_bulk(jobs: List[Dict], resume: Dict) -> List[Dict]:
    if not jobs:
        return jobs
    return sorted(
        (match_job(j, resume) for j in jobs),
        key=lambda x: x.get("match_percent", 0),
        reverse=True
    )
    
class StartMockInterviewRequest(BaseModel):
    target_role: str = Field(..., example="Data Scientist")
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

class AnswerRequest(BaseModel):
    answer: str
    interviewer_name: Optional[str] = None
    elapsed_seconds: Optional[int] = None


class AnswerResponse(BaseModel):
    session_id: int
    feedback: Dict[str, Any]
    next_question: Optional[str]
    should_continue: bool
    rounds_completed: int


# ---------- Helper Functions to manage DB state ----------

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
        except json.JSONDecodeError:
            state = {}

    row["state_json"] = state
    return row


def save_mock_session(session_id: int, state: dict):
    mysql_db.execute(
        """
        UPDATE mock_interview_sessions
        SET state_json=%s, updated_at=NOW()
        WHERE session_id=%s
        """,
        (json.dumps(state), session_id)
    )    