# AI Career Mentor & Roadmap Generator

![AI Career Mentor Banner](https://capsule-render.vercel.app/api?type=waving&color=0:00c6ff,100:0072ff&height=300&section=header&text=AI%20Career%20Mentor&fontSize=80&animation=fadeIn&fontAlignY=35&desc=Your%20Virtual%20Career%20Strategist%20%7C%20Resume%20Analysis%20•%20Roadmaps%20&descAlignY=60&descSize=20)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![MySQL](https://img.shields.io/badge/Database-MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![AI](https://img.shields.io/badge/AI-Google_Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![Security](https://img.shields.io/badge/Security-MFA_%26_JWT-e53935?style=for-the-badge&logo=auth0&logoColor=white)](https://jwt.io/)

> **A Secure, AI-Powered Career Guidance Platform bridging the gap between academic learning and industry requirements.**

## 📌 Project Overview
**AI Career Mentor** is an intelligent web application designed to act as a virtual career strategist. By leveraging **Generative AI (LLMs)**, it analyzes user profiles to provide data-driven career guidance, identifying skill gaps and creating personalized learning paths.

The platform addresses the confusion many job seekers face by centralizing resume analysis, roadmap generation, and interview preparation into a single, secure environment.

### 🎯 Key Features
* **📄 Intelligent Resume Analysis:** Uses NLP to parse resumes, extract skills, and perform a "Gap Analysis" against industry standards.
* **🗺️ Personalized Career Roadmaps:** Generates week-by-week learning curricula tailored to specific roles (e.g., "Full Stack Developer").
* **🎤 AI Mock Interviews:** Simulates technical interviews and provides instant AI-driven feedback on answer quality.
* **📈 Real-Time Job Integration:** Fetches relevant job listings and salary trends to ensure advice is grounded in market reality.

---

## ⚙️ Technology Stack

| Component | Tech Stack | Description |
| :--- | :--- | :--- |
| **Frontend** | React.js, Tailwind CSS | Responsive SPA with Context API state management |
| **Backend** | FastAPI (Python) | High-performance asynchronous REST API |
| **Database** | MySQL | Relational storage for User Data, Resumes, and Roadmaps |
| **AI / LLM** | Google Gemini / LangChain | Reasoning engine for resume parsing and chatbot logic |
| **Security** | Bcrypt, PyJWT, SendGrid | Cryptographic hashing, Stateless Auth, Email OTPs |

---

## 🔄 System Architecture & Workflow

The application follows a secure, microservices-inspired architecture to handle heavy AI processing without compromising user experience.



1.  **User Onboarding:** Secure registration with Email Verification.
2.  **Profile Building:** User defines career goals and uploads a resume.
3.  **AI Analysis:** The backend orchestrates AI models to extract insights.
4.  **Actionable Output:** System generates interactive roadmaps and interview sessions.

---

## 🔐 Security Audit & Compliance (SAAC) Implementation
> **Theme:** Secure Login System with Multi-Factor Authentication (MFA)

Since the AI Career Mentor processes highly sensitive **Personally Identifiable Information (PII)**—including resumes, professional history, and biometric voice data—security is a non-functional requirement of the highest priority.

This project implements rigorous **Security Audit & Compliance (SAAC)** principles to harden the authentication layer against modern web threats.

### 🛡️ Implemented Security Controls

#### 1️⃣ Multi-Factor Authentication (MFA)
We implemented a **Defense-in-Depth** strategy using a dual-verification process.
* **Mechanism:** On-Demand OTP (One-Time Password) sent via Email.
* **Security:** OTPs are hashed before storage in the database. Even DB admins cannot see valid codes.
* **Flow:** Login Credentials $\rightarrow$ Verify Hash $\rightarrow$ Email OTP $\rightarrow$ Issue JWT.

#### 2️⃣ Advanced Brute-Force Protection
* **Circuit Breaker:** Tracks failed login attempts per user.
* **Lockout Policy:** Accounts are temporarily locked after repeated failures to neutralize automated bot attacks.

#### 3️⃣ Secure Session Management
* **Stateless JWT:** Access tokens are signed (HS256) and issued *only* after full MFA verification.
* **Strict Expiry:** Tokens have short lifespans to mitigate session hijacking risks.

#### 4️⃣ Cryptographic Integrity
* **Zero-Knowledge Storage:** All passwords are hashed using **Bcrypt** with salt. No plaintext credentials exist in the system.
* **Secure Recovery:** Password resets require identity verification via OTP, eliminating insecure reset links.

### 📊 Security Impact Analysis
| Vulnerability | Mitigation Strategy | Result |
| :--- | :--- | :--- |
| **Credential Stuffing** | MFA (Email OTP) | Attack neutralized (Password alone is insufficient) |
| **Brute Force** | Rate Limiting / Lockout | Attackers blocked after threshold |
| **SQL Injection** | Parameterized Queries | Database integrity ensured |
| **Session Hijacking** | Short-lived JWTs | Reduced attack window |

---

## 🚀 Future Roadmap

### 🔐 Security Enhancements
- [ ] **Biometric Auth:** Voice-based verification using existing audio modules.
- [ ] **RBAC:** Admin and Mentor roles with granular permissions.
- [ ] **WebAuthn:** Hardware key support (YubiKey) for passwordless login.

### 🧠 Application Features
- [ ] **Advance Vector Search:** Semantic search for learning resources.
- [ ] **Community Hub:** Peer-to-peer mentorship and code reviews.
---

## 👥 Contributors
* **Ujjwal Upreti**
* **Vaibhav Joshi**
* **Vishal Singh**
* **Vishal Singh Rawat** 

---

## 💻 Frontend Interface
