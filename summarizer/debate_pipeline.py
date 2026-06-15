import json
from .ollama_client import OllamaClient

DEBATE_SYSTEM_PROMPT = """
You are an AI assistant that generates balanced, factual debates on US legislation. Your task is to analyze the provided bill text and generate a list of pros and cons.

Rules:
1.  **Generate 3-5 objective "Pro" points.** These should highlight the potential benefits, problems solved, or positive impacts of the legislation.
2.  **Generate 3-5 objective "Con" points.** These should highlight the potential drawbacks, new problems created, or negative impacts.
3.  **Strict Neutrality:** Do NOT take a side or use politically charged language. Your tone must be neutral, academic, and purely factual.
4.  **Cite Sources:** Where possible, reference the part of the bill that supports your point (e.g., "Pro: Reduces emissions by requiring new standards in Section 2(a).").
5.  **Output Format:** You MUST return a single, valid JSON object. The format should be:
    {
      "pros": [
        "Pro point 1...",
        "Pro point 2..."
      ],
      "cons": [
        "Con point 1...",
        "Con point 2..."
      ]
    }
6.  **Insufficient Text:** If the provided text is too short or lacks substance to generate a meaningful debate, you MUST return the following JSON object:
    {
      "error": "INSUFFICIENT_SOURCE_TEXT"
    }
"""

class DebatePipeline:
    def __init__(self, ollama_client=None):
        self.ollama_client = ollama_client or OllamaClient()

    def generate_debate(self, bill_text):
        """
        Generates a pro/con debate from the bill text using the Ollama model.
        """
        if not bill_text or len(bill_text.strip()) < 100:
            return {"error": "INSUFFICIENT_SOURCE_TEXT"}

        response_json = self.ollama_client.generate(bill_text, system_prompt=DEBATE_SYSTEM_PROMPT)
        generated_text = self.ollama_client.get_response_text(response_json)

        try:
            # The model should return valid JSON directly
            debate_data = json.loads(generated_text)
            if "error" in debate_data:
                return debate_data
            
            # Basic validation
            if "pros" in debate_data and "cons" in debate_data:
                 return debate_data
            else:
                return {"error": "INVALID_JSON_FORMAT"}

        except json.JSONDecodeError:
            # If the model fails to produce valid JSON, return an error
            return {"error": "JSON_DECODE_ERROR", "raw_output": generated_text}
