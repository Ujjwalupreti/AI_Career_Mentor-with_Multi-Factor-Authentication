
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from database import get_db
import logging, json

mysql_db = get_db()
logger = logging.getLogger(__name__)


class User:
    @staticmethod
    def create(
        email: str,
        password_hash: str,
        name: Optional[str] = None,
        current_role: Optional[str] = None,
        target_role: Optional[str] = None,
        location: Optional[str] = None,
        is_email_verified: int = 0,
        email_verification_token: Optional[datetime] = None,
        email_verification_expires: Optional[datetime] = None
    ) -> int:
        with mysql_db.get_cursor() as cursor:
            cursor.execute("""
                INSERT INTO USERS (
                    email, password_hash, name, current_role, target_role, location,
                    is_email_verified, email_verification_token, email_verification_expires,
                    created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """, (
                email, password_hash, name, current_role, target_role, location,
                is_email_verified, email_verification_token, email_verification_expires
            ))
            return cursor.lastrowid

    @staticmethod
    def get_by_email(email: str) -> Optional[Dict]:
        return mysql_db.fetch_one("SELECT * FROM USERS WHERE email = %s", (email,))

    @staticmethod
    def get_by_id(user_id: int) -> Optional[Dict]:
        return mysql_db.fetch_one("SELECT * FROM USERS WHERE user_id = %s", (user_id,))

    @staticmethod
    def update(user_id: int, **fields):
        allowed = {
            "name", "current_role", "target_role", "location",
            "is_email_verified", "email_verification_token", "email_verification_expires",
            "mfa_temp_token", "mfa_otp_hash", "mfa_otp_expires"
        }
        updates = {k: v for k, v in fields.items() if k in allowed}
        if not updates:
            return None

        columns = ", ".join([f"{k} = %s" for k in updates.keys()])
        values = list(updates.values()) + [user_id]

        with mysql_db.get_cursor() as cursor:
            sql = f"UPDATE USERS SET {columns}, updated_at = NOW() WHERE user_id = %s"
            cursor.execute(sql, values)
        return user_id


class Resume:
    """Resume model with binary storage and parsed JSON."""

    @staticmethod
    def create_binary(user_id: int, filename: str, file_bytes: bytes, mime_type: str, parsed_json: dict):
        """Store uploaded resume file + parsed JSON directly in DB."""
        try:
            query = """
                INSERT INTO resumes (user_id, file_path, raw_file, mime_type, parsed_json, uploaded_at)
                VALUES (%s, %s, %s, %s, %s, %s)
            """
            mysql_db.execute_query(query, (
                user_id,
                filename,
                file_bytes,
                mime_type,
                json.dumps(parsed_json, ensure_ascii=False),
                datetime.now(),
            ))
            logger.info(f"[create_binary] ✅ Resume '{filename}' stored for user {user_id}")
        except Exception as e:
            logger.exception(f"[create_binary] ❌ Failed to store resume: {e}")
            raise

    @staticmethod
    def create_json(user_id: int, file_path: str, parsed_json: dict):
        """Legacy wrapper for backward compatibility."""
        Resume.create_binary(user_id, file_path, b"", "application/pdf", parsed_json)

    @staticmethod
    def get_by_user(user_id: int, limit: int = 7):
        query = "SELECT resume_id, file_path, uploaded_at FROM resumes WHERE user_id=%s ORDER BY uploaded_at DESC LIMIT %s"
        return mysql_db.fetch_all(query, (user_id, limit))

    @staticmethod
    def get_by_id(resume_id: int):
        query = "SELECT * FROM resumes WHERE resume_id=%s"
        return mysql_db.fetch_one(query, (resume_id,))

    @staticmethod
    def delete(resume_id: int, user_id: int):
        query = "DELETE FROM resumes WHERE resume_id=%s AND user_id=%s"
        mysql_db.execute_query(query, (resume_id, user_id))
        logger.info(f"[delete] Resume {resume_id} deleted by user {user_id}")

    @staticmethod
    def get_binary(resume_id: int):
        """Retrieve raw binary file and MIME type."""
        query = "SELECT raw_file, mime_type, file_path FROM resumes WHERE resume_id=%s"
        return mysql_db.fetch_one(query, (resume_id,))
    
    @staticmethod
    def get_latest(user_id: int) -> Optional[Dict]:
        """Return the latest uploaded resume for the user."""
        try:
            row = mysql_db.fetch_one(
                "SELECT * FROM resumes WHERE user_id = %s ORDER BY uploaded_at DESC LIMIT 1",
                (user_id,),
            )
            if not row:
                return None
            if isinstance(row.get("parsed_json"), str):
                try:
                    row["parsed_json"] = json.loads(row["parsed_json"])
                except Exception:
                    row["parsed_json"] = {}
            return row
        except Exception as e:
            logger.error(f"[Resume.get_latest] {e}")
            return None


class Skill:
    @staticmethod
    def get_or_create(skill_name: str, category: str = None) -> int:
        row = mysql_db.fetch_one("SELECT skill_id FROM SKILLS WHERE skill_name = %s", (skill_name,))
        if row:
            return row["skill_id"]
        with mysql_db.get_cursor() as cursor:
            cursor.execute(
                "INSERT INTO SKILLS (skill_name, category) VALUES (%s, %s)",
                (skill_name, category),
            )
            return cursor.lastrowid

    @staticmethod
    def get_all() -> List[Dict]:
        return mysql_db.fetch_all("SELECT * FROM SKILLS")



class UserSkill:
    @staticmethod
    def create_or_update(user_id: int, skill_id: int, level: str):
        row = mysql_db.fetch_one(
            "SELECT user_skill_id FROM USER_SKILLS WHERE user_id = %s AND skill_id = %s",
            (user_id, skill_id),
        )
        with mysql_db.get_cursor() as cursor:
            if row:
                cursor.execute(
                    "UPDATE USER_SKILLS SET level = %s, last_updated = NOW() WHERE user_skill_id = %s",
                    (level, row["user_skill_id"]),
                )
            else:
                cursor.execute(
                    "INSERT INTO USER_SKILLS (user_id, skill_id, level, last_updated) VALUES (%s, %s, %s, NOW())",
                    (user_id, skill_id, level),
                )

    @staticmethod
    def get_by_user(user_id: int) -> List[Dict]:
        query = """
            SELECT us.*, s.skill_name, s.category
            FROM USER_SKILLS us
            JOIN SKILLS s ON us.skill_id = s.skill_id
            WHERE us.user_id = %s
        """
        return mysql_db.fetch_all(query, (user_id,))



class Roadmap:
    @staticmethod
    def create(user_id: int, target_role: str,
               start_date: Optional[datetime] = None,
               end_date: Optional[datetime] = None,
               completion_percentage: float = 0.0) -> int:
        start_date = start_date or datetime.now().date()
        end_date = end_date or (datetime.now() + timedelta(days=180)).date()
        with mysql_db.get_cursor() as cursor:
            cursor.execute("""
                INSERT INTO roadmaps (user_id, target_role, start_date, end_date, completion_percentage)
                VALUES (%s, %s, %s, %s, %s)
            """, (user_id, target_role, start_date, end_date, completion_percentage))
            return cursor.lastrowid

    @staticmethod
    def get_by_user(user_id: int) -> List[Dict]:
        with mysql_db.get_cursor(dictionary=True) as cursor:
            cursor.execute("""
                SELECT roadmap_id, user_id, target_role, start_date, end_date, completion_percentage
                FROM roadmaps WHERE user_id=%s ORDER BY roadmap_id DESC
            """, (user_id,))
            return cursor.fetchall()

    @staticmethod
    def get_by_id(roadmap_id: int, user_id: int) -> Dict:
        row = mysql_db.fetch_one("""
            SELECT roadmap_id, user_id, target_role, start_date, end_date, completion_percentage
            FROM roadmaps WHERE roadmap_id=%s AND user_id=%s
        """, (roadmap_id, user_id))
        if not row:
            raise Exception("Roadmap not found")
        return row

    @staticmethod
    def update_progress(roadmap_id: int, percent: float):
        with mysql_db.get_cursor() as cursor:
            cursor.execute(
                "UPDATE roadmaps SET completion_percentage=%s WHERE roadmap_id=%s",
                (percent, roadmap_id)
            )

    @staticmethod
    def delete(roadmap_id: int, user_id: int):
        with mysql_db.get_cursor() as cursor:
            cursor.execute("DELETE FROM roadmap_steps WHERE roadmap_id=%s", (roadmap_id,))
            cursor.execute("DELETE FROM roadmaps WHERE roadmap_id=%s AND user_id=%s", (roadmap_id, user_id))



class RoadmapStep:
    @staticmethod
    def create_full_roadmap(roadmap_id: int, roadmap_data: dict):
        """Store entire roadmap JSON (overview, skills, jobs, etc.) into description."""
        try:
            json_str = json.dumps(roadmap_data, ensure_ascii=False)
            with mysql_db.get_cursor() as cursor:
                cursor.execute("""
                    INSERT INTO roadmap_steps (roadmap_id, description, completed)
                    VALUES (%s, %s, 0)
                """, (roadmap_id, json_str))
        except Exception as e:
            logger.error(f"[RoadmapStep.create_full_roadmap] {e}")

    @staticmethod
    def get_by_roadmap(roadmap_id: int) -> Optional[Dict]:
        """Return the full roadmap JSON (single row)."""
        row = mysql_db.fetch_one(
            "SELECT description FROM roadmap_steps WHERE roadmap_id=%s ORDER BY step_id ASC LIMIT 1",
            (roadmap_id,)
        )
        if not row:
            return {}
        desc = row.get("description")
        if isinstance(desc, str):
            try:
                return json.loads(desc)
            except Exception:
                logger.warning("[RoadmapStep.get_by_roadmap] Invalid JSON structure")
                return {}
        return desc or {}    
    
    @staticmethod
    def update_content(roadmap_id: int, roadmap_data: dict):
        """Update the full roadmap JSON blob."""
        try:
            json_str = json.dumps(roadmap_data, ensure_ascii=False)
            with mysql_db.get_cursor() as cursor:
                cursor.execute("""
                    UPDATE roadmap_steps 
                    SET description = %s 
                    WHERE roadmap_id = %s
                """, (json_str, roadmap_id))
        except Exception as e:
            logger.error(f"[RoadmapStep.update_content] {e}")
            raise
        
    
class Resource:
    @staticmethod
    def get_by_url(url: str):
        return mysql_db.fetch_one(
            "SELECT * FROM resources WHERE url=%s LIMIT 1", (url,)
        )

    @staticmethod
    def create(r: dict):
        if not r.get("url"):
            return None
        existing = Resource.get_by_url(r["url"])
        if existing:
            return existing["resource_id"]

        mysql_db.execute(
            """INSERT INTO resources 
            (title, provider, type, url, difficulty, duration_minutes, rating)
            VALUES (%s,%s,%s,%s,%s,%s,%s)
            """,
            (
                r.get("title"),
                r.get("provider"),
                r.get("type"),
                r.get("url"),
                r.get("difficulty"),
                r.get("duration_minutes"),
                r.get("rating"),
            ),
        )
        return mysql_db.fetch_one(
            "SELECT resource_id FROM resources WHERE url=%s", (r["url"],)
        )["resource_id"]



class Job:
    @staticmethod
    def get_by_url(url: str):
        return mysql_db.fetch_one("SELECT * FROM jobs WHERE url=%s", (url,))

    @staticmethod
    def create(job):
        url = job.get("job_portal_link") or job.get("url")
        existing = Job.get_by_url(url)
        if existing:
            return existing["job_id"]

        mysql_db.execute(
            """INSERT INTO jobs (title, company, location, salary_range, url, posted_date, description)
               VALUES (%s,%s,%s,%s,%s,%s,%s)
            """,
            (
                job.get("role"),
                job.get("company"),
                job.get("location"),
                job.get("salary_range"),
                url,
                job.get("posted_date"),
                job.get("description"),
            ),
        )
        return mysql_db.fetch_one("SELECT job_id FROM jobs WHERE url=%s", (url,))[
            "job_id"
        ]        