
import os
from dotenv import load_dotenv
from typing import List

load_dotenv()

class Settings:
    
    MYSQL_HOST: str = os.getenv("MYSQL_HOST", "")
    MYSQL_PORT: int = int(os.getenv("MYSQL_PORT",))
    MYSQL_DATABASE: str = os.getenv("MYSQL_DATABASE", os.getenv("MYSQL_DB", "")) 
    MYSQL_DB: str = MYSQL_DATABASE
    MYSQL_USER: str = os.getenv("MYSQL_USER", "")
    MYSQL_PASSWORD: str = os.getenv("MYSQL_PASSWORD", "")
    
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "sk-proj-xxxxxxxxx")
    HUGGINGFACEHUB_API_TOKEN: str = os.getenv("HUGGINGFACEHUB_API_TOKEN","hf_xxxxxxxx")
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY","AIxxxxxxxxxx")
    
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "43200"))

    # SendGrid / MFA
    SENDGRID_API_KEY: str = os.getenv("SENDGRID_API_KEY", "SG.xxxxxxxxxxx")
    SENDGRID_FROM_EMAIL: str = os.getenv("SENDGRID_FROM_EMAIL", "no-reply@domain.com")
    SENDGRID_FROM_NAME: str = os.getenv("SENDGRID_FROM_NAME", "AI Career Mentor")
    OTP_EXPIRE_MINUTES: int = int(os.getenv("OTP_EXPIRE_MINUTES", "5"))
    ALLOW_DISPOSABLE_EMAILS: bool = os.getenv("ALLOW_DISPOSABLE_EMAILS", "false").lower() == "true"

    # Frontend
    FRONTEND_BASE_URL: str = os.getenv("FRONTEND_BASE_URL", "")

    JSEARCH_RAPIDAPI_KEY: str = os.getenv("JSEARCH_RAPIDAPI_KEY", "")
    JSEARCH_RAPIDAPI_HOST: str = os.getenv("JSEARCH_RAPIDAPI_HOST", "")
    
    AZURE_TTS_KEY: str = os.getenv("AZURE_TTS_KEY", "")
    AZURE_TTS_REGION: str = os.getenv("AZURE_TTS_REGION", "")
    AZURE_TTS_VOICE: str = os.getenv("AZURE_TTS_VOICE", "")
    
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    CORS_ORIGINS: List[str] = os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://localhost:3000"
    ).split(",")


settings = Settings()