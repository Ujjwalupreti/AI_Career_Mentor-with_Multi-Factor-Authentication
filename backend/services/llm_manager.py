# backend/services/llm_manager.py

import sys
import asyncio
import logging
from typing import Optional, Dict, Any, Tuple
from pydantic import BaseModel

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import ChatHuggingFace, HuggingFaceEndpoint
from langchain_core.messages import HumanMessage

from config import settings
from services.services_utils import is_model_on_cooldown, set_model_cooldown

logger = logging.getLogger("services.llm_manager")
logger.setLevel(logging.INFO)

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

QUOTA_ERRORS = [
    "429", "rate", "limit", "quota", "insufficient_quota",
    "resourceexhausted", "you exceeded your current quota",
    "generativelanguage.googleapis.com", "deadline", "504"
]

class LLMManager:
    def __init__(self):
        self.gemini_key = settings.GOOGLE_API_KEY
        self.hf_token = settings.HUGGINGFACEHUB_API_TOKEN

        self.gemini_models = [
            ("gemini-2.5-flash",0.5),("gemini-2.0-flash", 0.5),("gemini-2.5-pro", 0.5),("gemini-2.5-flash-lite", 0.5),
        ]
        self.hf_model = ("mistralai/Mistral-7B-Instruct-v0.2", 0.5)

        self.gemini_client = self._init_gemini()
        self.hf_client = self._init_huggingface()

    def _init_gemini(self):
        if not self.gemini_key:
            logger.warning("[LLMManager] No Google API Key found.")
            return None
        try:
            m, temp = self.gemini_models[0]
            client = ChatGoogleGenerativeAI(
                model=m,
                google_api_key=self.gemini_key,
                temperature=temp,
                max_output_tokens=8192,
                request_timeout=300,
                max_retries=0,
            )
            logger.info(f"[LLM] ✅ Gemini initialized: {m}")
            return client
        except Exception as e:
            logger.error(f"[LLM] ❌ Failed to init Gemini: {e}")
            return None

    def _init_huggingface(self):
        if not self.hf_token:
            return None
        try:
            repo, temp = self.hf_model
            hf_endpoint = HuggingFaceEndpoint(
                repo_id=repo,
                task="text-generation",
                huggingfacehub_api_token=self.hf_token,
                temperature=temp,
                max_new_tokens=2000,
                timeout=180,
            )
            client = ChatHuggingFace(llm=hf_endpoint)
            return client
        except Exception as e:
            logger.error(f"[LLM] ❌ Failed to init HuggingFace: {e}")
            return None

    async def _call(self, llm, prompt: str) -> str:
        try:
            safe_prompt = prompt[:30000]
            result = await llm.ainvoke([HumanMessage(content=safe_prompt)])
            text = getattr(result, "content", None) or getattr(result, "text", None)
            return str(text or "").strip()
        except Exception as e:
            raise RuntimeError(str(e))

    async def run_llm(
        self,
        prompt: str,
        variables: Optional[Dict[str, Any]] = None,
        preference: str = "auto",
        retries: int = 2,
        response_schema: Optional[BaseModel] = None,
    ) -> Tuple[str, str]:

        if variables:
            for k, v in variables.items():
                val = str(v) if v is not None else ""
                prompt = prompt.replace("{" + k + "}", val)

        model_map = {
            "Gemini": self.gemini_client,
            "HuggingFace": self.hf_client,
        }
        order = [(preference, model_map.get(preference))] if preference in model_map else []
        order += [(k, v) for k, v in model_map.items() if (k, v) not in order]

        for name, client in order:
            if not client:
                continue
            if is_model_on_cooldown(name):
                continue

            use_client = client
            if response_schema:
                try:
                    use_client = client.with_structured_output(response_schema)
                except Exception:
                    use_client = client

            for attempt in range(1, retries + 1):
                try:
                    res = await self._call(use_client, prompt)
                    return res, name
                except Exception as e:
                    err = str(e).lower()
                    logger.warning(f"[LLMManager] ⚠️ {name} attempt {attempt} failed: {err}")

                    if "deadline" in err or "504" in err:
                        logger.warning(f"[LLMManager] ⏳ Timeout on {name}. Retrying...")
                        await asyncio.sleep(2)
                        continue

                    if any(p in err for p in QUOTA_ERRORS):
                        set_model_cooldown(name, 600)
                        break

                    await asyncio.sleep(1)

        raise RuntimeError("All available models failed.")

llm_manager = LLMManager()

async def run_llm(prompt: str, variables: Optional[Dict[str, Any]] = None, preference: str = "auto") -> str:
    try:
        output, model = await llm_manager.run_llm(prompt, variables, preference)
        return output
    except Exception as e:
        logger.error(f"[run_llm] ❌ Error: {e}")
        return ""