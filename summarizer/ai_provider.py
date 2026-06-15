import os
import requests
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class AIProvider:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AIProvider, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
            
        self.tier = os.getenv("AI_TIER", "local").lower()
        self.ollama_url = os.getenv("OLLAMA_API_URL", "http://localhost:11434")
        self.google_api_key = os.getenv("GOOGLE_GENERATIVE_AI_API_KEY")
        
        if self.google_api_key:
            genai.configure(api_key=self.google_api_key)
            
        self._initialized = True

    def generate_text(self, prompt, system_prompt=None, tier_override=None):
        tier = tier_override or self.tier
        
        if tier == "local":
            return self._generate_ollama(prompt, system_prompt)
        else:
            return self._generate_gemini(prompt, system_prompt, tier)

    def _generate_ollama(self, prompt, system_prompt):
        """Fallback to local Ollama (Gemma 4 / Llama 3)"""
        url = f"{self.ollama_url}/api/generate"
        payload = {
            "model": "llama3:8b", # Default to Llama 3 for now, user mentioned Gemma 4
            "prompt": prompt,
            "stream": False
        }
        if system_prompt:
            payload["system"] = system_prompt
            
        try:
            response = requests.post(url, json=payload)
            response.raise_for_status()
            return response.json().get("response", "")
        except Exception as e:
            # If Ollama fails, try cloud if API key exists
            if self.google_api_key:
                return self._generate_gemini(prompt, system_prompt, "flash")
            raise Exception(f"Ollama error: {e}")

    def _generate_gemini(self, prompt, system_prompt, tier):
        """Use Google Gemini 2.0 Flash/Pro"""
        if not self.google_api_key:
            # Fallback to local if no API key
            return self._generate_ollama(prompt, system_prompt)
            
        model_name = "gemini-1.5-flash"
        if tier == "pro":
            model_name = "gemini-1.5-pro"
        elif tier == "flash":
            model_name = "gemini-2.0-flash-exp" # Standardizing on Flash 2.0
            
        try:
            model = genai.GenerativeModel(
                model_name=model_name,
                system_instruction=system_prompt
            )
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            # Fallback to local on cloud failure
            return self._generate_ollama(prompt, system_prompt)

# Global singleton
ai_provider = AIProvider()
