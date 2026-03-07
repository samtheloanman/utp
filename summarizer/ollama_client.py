import requests
import json

class OllamaClient:
    def __init__(self, base_url="http://localhost:11434/api/generate", model="llama3:8b"):
        self.base_url = base_url
        self.model = model

    def generate(self, prompt, system_prompt=None, stream=False):
        """
        Sends a request to the Ollama API to generate a response.
        """
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": stream
        }
        if system_prompt:
            payload["system"] = system_prompt

        try:
            response = requests.post(self.base_url, json=payload)
            response.raise_for_status()

            if stream:
                return response
            else:
                return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"Error communicating with Ollama: {e}")

    def get_response_text(self, response_json):
        """
        Extracts the generated text from the Ollama response JSON.
        """
        return response_json.get("response", "")
