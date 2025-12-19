# backend/db_migrator.py

import traceback
from database import mysql_db

MIGRATIONS = {
    "users": """
        CREATE TABLE IF NOT EXISTS users (
            user_id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,

            name VARCHAR(255),
            current_role VARCHAR(255),
            target_role VARCHAR(255),
            location VARCHAR(255),

            xp_points INT DEFAULT 0,
            badges TEXT,

            is_email_verified TINYINT(1) NOT NULL DEFAULT 0,
            email_verification_token VARCHAR(255),
            email_verification_expires DATETIME,

            mfa_temp_token VARCHAR(255),
            mfa_otp_hash VARCHAR(255),
            mfa_otp_expires DATETIME,

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP
        );
    """,
    "mock_interview_sessions": """
        CREATE TABLE IF NOT EXISTS mock_interview_sessions (
            session_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            target_role VARCHAR(255) NOT NULL,
            difficulty VARCHAR(50) NOT NULL,
            num_interviewers INT NOT NULL,
            duration_minutes INT NOT NULL,
            state_json JSON NOT NULL,
            status VARCHAR(50) DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
                ON DELETE CASCADE
        );
    """,
    "resumes": """
        CREATE TABLE IF NOT EXISTS resumes (
            resume_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            filename VARCHAR(255),
            file_path VARCHAR(500),
            raw_file LONGBLOB,
            mime_type VARCHAR(255),
            parsed_json JSON,
            uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
                ON DELETE CASCADE
        );
    """,
    "skills": """
        CREATE TABLE IF NOT EXISTS skills (
            skill_id INT AUTO_INCREMENT PRIMARY KEY,
            skill_name VARCHAR(255) UNIQUE NOT NULL,
            category VARCHAR(255)
        );
    """,

    "user_skills": """
        CREATE TABLE IF NOT EXISTS user_skills (
            user_skill_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            skill_id INT NOT NULL,
            level VARCHAR(50),
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
                ON DELETE CASCADE,
            FOREIGN KEY (skill_id) REFERENCES skills(skill_id)
                ON DELETE CASCADE
        );
    """,
    "roadmaps": """
        CREATE TABLE IF NOT EXISTS roadmaps (
            roadmap_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            target_role VARCHAR(255),
            start_date DATE,
            end_date DATE,
            completion_percentage FLOAT DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
                ON DELETE CASCADE
        );
    """,

    "roadmap_steps": """
        CREATE TABLE IF NOT EXISTS roadmap_steps (
            step_id INT AUTO_INCREMENT PRIMARY KEY,
            roadmap_id INT NOT NULL,
            skill_id INT,
            description TEXT,
            due_date DATE,
            completed BOOLEAN DEFAULT FALSE,
            FOREIGN KEY (roadmap_id) REFERENCES roadmaps(roadmap_id)
                ON DELETE CASCADE,
            FOREIGN KEY (skill_id) REFERENCES skills(skill_id)
                ON DELETE SET NULL
        );
    """,
    "resources": """
        CREATE TABLE IF NOT EXISTS resources (
            resource_id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255),
            provider VARCHAR(255),
            type VARCHAR(100),
            url VARCHAR(500),
            difficulty VARCHAR(50),
            duration_minutes INT,
            rating FLOAT
        );
    """,
    "jobs": """
        CREATE TABLE IF NOT EXISTS jobs (
            job_id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255),
            company VARCHAR(255),
            location VARCHAR(255),
            salary_range VARCHAR(255),
            url VARCHAR(500),
            posted_date DATE
        );
    """,

    "job_requirements": """
        CREATE TABLE IF NOT EXISTS job_requirements (
            requirement_id INT AUTO_INCREMENT PRIMARY KEY,
            job_id INT NOT NULL,
            skill_id INT NOT NULL,
            FOREIGN KEY (job_id) REFERENCES jobs(job_id)
                ON DELETE CASCADE,
            FOREIGN KEY (skill_id) REFERENCES skills(skill_id)
                ON DELETE CASCADE
        );
    """
}


def run_migrations():
    try:
        with mysql_db.get_cursor() as cursor:
            for table, query in MIGRATIONS.items():
                print(f"→ Ensuring table: {table}")
                cursor.execute(query)
    except Exception:
        traceback.print_exc()


if __name__ == "__main__":
    run_migrations()
