import logging
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
import secrets
import dns.resolver
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from python_http_client.exceptions import ForbiddenError, HTTPError as SendgridHTTPError

from database import get_db
from models import User
from config import settings

router = APIRouter()
logger = logging.getLogger("auth")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

SENDGRID_API_KEY = settings.SENDGRID_API_KEY
SENDGRID_FROM_EMAIL = settings.SENDGRID_FROM_EMAIL
SENDGRID_FROM_NAME = settings.SENDGRID_FROM_NAME
OTP_EXPIRE_MINUTES = settings.OTP_EXPIRE_MINUTES
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
JWT_SECRET_KEY = settings.JWT_SECRET_KEY
JWT_ALGORITHM = settings.JWT_ALGORITHM
FRONTEND_BASE_URL = settings.FRONTEND_BASE_URL
ALLOW_DISPOSABLE_EMAILS = settings.ALLOW_DISPOSABLE_EMAILS
REQUIRE_EMAIL_DELIVERY = getattr(settings, "REQUIRE_EMAIL_DELIVERY", True)

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None
    current_role: str | None = None
    target_role: str | None = None
    location: str | None = None

class LoginPasswordRequest(BaseModel):
    email: EmailStr
    password: str

class LoginOtpRequest(BaseModel):
    temp_token: str
    otp: str

class ResendOtpRequest(BaseModel):
    email: EmailStr

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    temp_token: str
    otp: str
    new_password: str


def create_access_token(user_id: int):
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        uid = payload.get("sub")
        if not uid:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = User.get_by_id(int(uid))
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

DISPOSABLE_DOMAINS = {"mailinator.com", "tempmail.com", "yopmail.com", "guerrillamail.com", "10minutemail.com", "fakeinbox.com"}
def is_disposable(email: str) -> bool:
    domain = email.split("@")[-1].lower()
    return domain in DISPOSABLE_DOMAINS

def has_mx_record(email: str) -> bool:
    domain = email.split("@")[-1]
    try:
        answers = dns.resolver.resolve(domain, "MX")
        return len(answers) > 0
    except Exception:
        return False

def generate_otp() -> str:
    return f"{secrets.randbelow(900000) + 100000}"  

def send_email_sendgrid(to_email: str, subject: str, html_content: str):
    """
    Send email via SendGrid. Returns True if successful.
    Raises HTTPException for fatal conditions when REQUIRE_EMAIL_DELIVERY=True.
    If REQUIRE_EMAIL_DELIVERY=False and SENDGRID_API_KEY not set -> logs and returns True (dev fallback).
    """
    if not SENDGRID_API_KEY:
        msg = "SendGrid API key not configured."
        logger.warning(msg)
        if REQUIRE_EMAIL_DELIVERY:
            raise HTTPException(status_code=500, detail=msg)
        else:
            
            logger.info("[DEV EMAIL FALLBACK] to=%s subject=%s\n%s", to_email, subject, html_content)
            return True

    message = Mail(
        from_email=(SENDGRID_FROM_EMAIL, SENDGRID_FROM_NAME),
        to_emails=to_email,
        subject=subject,
        html_content=html_content
    )

    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        resp = sg.send(message)
        status = getattr(resp, "status_code", None)
        logger.info("[SendGrid] Sent email to %s (status=%s)", to_email, status)
        if status and 200 <= int(status) < 300:
            return True
        else:
            
            logger.error("[SendGrid] Unexpected status %s", status)
            return False
    except ForbiddenError as e:
        logger.exception("SendGrid Forbidden (403) when sending to %s: %s", to_email, e)
        raise HTTPException(status_code=502, detail="Email provider refused the request (403). Check API key and verified sender in SendGrid.")
    except SendgridHTTPError as e:
        logger.exception("SendGrid HTTP error: %s", e)
        raise HTTPException(status_code=502, detail=f"Email provider HTTP error: {str(e)}")
    except Exception as e:
        logger.exception("SendGrid send failed: %s", e)
        raise HTTPException(status_code=502, detail="Failed to send email")


@router.post("/signup")
def signup(payload: SignupRequest):
    
    if User.get_by_email(payload.email):
        raise HTTPException(status_code=409, detail="User already exists")
    if not ALLOW_DISPOSABLE_EMAILS and is_disposable(payload.email):
        raise HTTPException(status_code=400, detail="Disposable email provider not allowed")
    if not has_mx_record(payload.email):
        raise HTTPException(status_code=400, detail="Email domain does not accept mail")

    db = get_db()
    try:
        with db.get_cursor() as cursor:
            
            password_hash = pwd_context.hash(payload.password)
            cursor.execute("""
                INSERT INTO USERS (
                    email, password_hash, name, current_role, target_role, location,
                    is_email_verified, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """, (
                payload.email, password_hash, payload.name, payload.current_role,
                payload.target_role, payload.location, 0
            ))
            user_id = cursor.lastrowid

            
            otp = generate_otp()
            otp_hash = pwd_context.hash(otp)
            temp_token = secrets.token_urlsafe(32)
            otp_expires = datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES)

            cursor.execute("""
                UPDATE USERS SET mfa_temp_token=%s, mfa_otp_hash=%s, mfa_otp_expires=%s
                WHERE user_id=%s
            """, (temp_token, otp_hash, otp_expires, user_id))

            
            html = f"""
            <p>Hello {payload.name or ''},</p>
            <p>Your verification code is:</p>
            <h2 style="font-size:24px">{otp}</h2>
            <p>This code expires in {OTP_EXPIRE_MINUTES} minutes.</p>
            """

            
            send_email_sendgrid(payload.email, "Your verification code", html)

            
            logger.info("[signup] Created user_id=%s and sent OTP to %s", user_id, payload.email)
            return {"mfa_required": True, "temp_token": temp_token, "message": "OTP sent to your email."}
    except HTTPException:
        logger.exception("[signup] Email delivery or validation failed for %s", payload.email)
        
        raise
    except Exception as e:
        logger.exception("[signup] Unexpected error for %s: %s", payload.email, e)
        raise HTTPException(status_code=500, detail="Signup failed. Please try again later.")


@router.post("/resend-otp")
def resend_otp(payload: ResendOtpRequest):
    user = User.get_by_email(payload.email)
    if not user:
        
        logger.info("[resend-otp] Request for non-existing email: %s", payload.email)
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("is_email_verified"):
        return {"message": "Email already verified"}
    otp = generate_otp()
    otp_hash = pwd_context.hash(otp)
    temp_token = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES)
    User.update(user["user_id"], mfa_temp_token=temp_token, mfa_otp_hash=otp_hash, mfa_otp_expires=expires)
    html = f"""
    <p>Your verification code is:</p>
    <h2 style="font-size:24px">{otp}</h2>
    <p>This code expires in {OTP_EXPIRE_MINUTES} minutes.</p>
    """
    send_email_sendgrid(payload.email, "Resend: Your verification code", html)
    return {"mfa_required": True, "temp_token": temp_token, "message": "OTP resent to your email."}


@router.post("/login_password")
def login_password(payload: LoginPasswordRequest):
    user = User.get_by_email(payload.email)
    if not user or not pwd_context.verify(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.get("is_email_verified"):
        raise HTTPException(status_code=403, detail="Email not verified. Please verify via OTP or request resend.")

    otp = generate_otp()
    otp_hash = pwd_context.hash(otp)
    temp_token = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES)

    User.update(user["user_id"], mfa_temp_token=temp_token, mfa_otp_hash=otp_hash, mfa_otp_expires=expires)
    html = f"""
    <p>Your one-time login code is:</p>
    <h2 style="font-size:24px">{otp}</h2>
    <p>This code expires in {OTP_EXPIRE_MINUTES} minutes.</p>
    """
    send_email_sendgrid(user["email"], "Your login OTP", html)
    return {"mfa_required": True, "temp_token": temp_token, "message": "OTP sent to your email."}


@router.post("/login_otp")
def login_otp(payload: LoginOtpRequest):
    db = get_db()
    user = db.fetch_one("SELECT * FROM USERS WHERE mfa_temp_token = %s", (payload.temp_token,))
    if not user:
        raise HTTPException(status_code=400, detail="Invalid MFA session")
    if not user.get("mfa_otp_expires") or user["mfa_otp_expires"] < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP expired")
    if not pwd_context.verify(payload.otp, user["mfa_otp_hash"]):
        raise HTTPException(status_code=401, detail="Invalid OTP")

    User.update(user["user_id"], mfa_temp_token=None, mfa_otp_hash=None, mfa_otp_expires=None, is_email_verified=1)
    token = create_access_token(user["user_id"])
    return {"access_token": token, "token_type": "bearer"}


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest):
    user = User.get_by_email(payload.email)
    if not user:
        logger.info("[forgot-password] Request for non-existing email: %s", payload.email)
        return {"message": "If this email exists you will receive a reset code."}
    otp = generate_otp()
    otp_hash = pwd_context.hash(otp)
    temp_token = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES)
    User.update(user["user_id"], mfa_temp_token=temp_token, mfa_otp_hash=otp_hash, mfa_otp_expires=expires)
    html = f"""
    <p>Hello {user.get('name') or ''},</p>
    <p>Use the code below to reset your password:</p>
    <h2 style="font-size:22px">{otp}</h2>
    <p>This code expires in {OTP_EXPIRE_MINUTES} minutes.</p>
    """
    send_email_sendgrid(payload.email, "Password reset code", html)
    logger.info("[forgot-password] Sent password reset OTP to %s", payload.email)
    return {"mfa_required": True, "temp_token": temp_token, "message": "Password reset code sent if the email exists."}

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest):
    email = payload.email.lower().strip()
    otp = payload.otp.strip()
    new_password = payload.new_password

    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    db = get_db()
    user = db.fetch_one("SELECT * FROM USERS WHERE email=%s", (email,))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    
    if not user["mfa_temp_token"] or user["mfa_temp_token"] != payload.temp_token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset session")

    
    if not pwd_context.verify(otp, user["mfa_otp_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect OTP")

    if user["mfa_otp_expires"] < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP expired")

    
    new_hash = pwd_context.hash(new_password)

    
    rows = db.execute_query("""
        UPDATE USERS
        SET password_hash=%s,
            mfa_temp_token=NULL,
            mfa_otp_hash=NULL,
            mfa_otp_expires=NULL,
            updated_at=NOW()
        WHERE email=%s
    """, (new_hash, email))

    if rows == 0:
        raise HTTPException(status_code=500, detail="Failed to update password")

    
    token = create_access_token(user["user_id"])

    return {
        "message": "Password reset successful",
        "access_token": token,
        "token_type": "bearer"
    }

@router.get("/verify")
def verify(current_user = Depends(get_current_user)):
    return {
        "user_id": current_user.get("user_id"),
        "email": current_user.get("email"),
        "name": current_user.get("name"),
        "current_role": current_user.get("current_role"),
        "target_role": current_user.get("target_role"),
        "location": current_user.get("location"),
        "is_email_verified": bool(current_user.get("is_email_verified", 0))
    }
    
@router.post("/logout")
def logout(current_user: dict = Depends(get_current_user)):
    return {"message": "Logged out successfully"}