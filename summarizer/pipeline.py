import re
import json
from .ollama_client import OllamaClient

SYSTEM_PROMPT = """
You are summarizing US legislation. Rules:
1. Extract TL;DR (max 2 sentences)
2. List 3-5 key changes this bill makes
3. MUST cite specific sections (e.g., "Section 3(a) requires...")
4. If insufficient text, return {"error": "INSUFFICIENT_SOURCE_TEXT"}
5. No political opinions - neutral tone only
"""

class SummarizationPipeline:
    def __init__(self, ollama_client=None):
        self.ollama_client = ollama_client or OllamaClient()

    def summarize(self, bill_text):
        """
        Summarizes the bill text using the Ollama model and extracts citations.
        """
        if not bill_text or len(bill_text.strip()) < 50:
            return {"error": "INSUFFICIENT_SOURCE_TEXT"}

        response_json = self.ollama_client.generate(bill_text, system_prompt=SYSTEM_PROMPT)
        generated_text = self.ollama_client.get_response_text(response_json)

        # Check if the AI returned the error message in JSON format
        if "INSUFFICIENT_SOURCE_TEXT" in generated_text:
            try:
                # Attempt to parse if it's a JSON string
                err_data = json.loads(generated_text)
                if err_data.get("error") == "INSUFFICIENT_SOURCE_TEXT":
                    return err_data
            except:
                # If not valid JSON but contains the error string, assume it's the error
                if generated_text.strip() == '{"error": "INSUFFICIENT_SOURCE_TEXT"}':
                     return {"error": "INSUFFICIENT_SOURCE_TEXT"}

        citations = self.extract_citations(generated_text)

        return {
            "summary": generated_text,
            "citations": citations
        }

    def extract_citations(self, text):
        """
        Extracts section citations from the generated text.
        Matches patterns like 'Section 3', 'Section 3(a)', 'Section 101(b)(2)', etc.
        """
        # Improved regex to handle various section citation formats
        # Handles: Section 123, Section 123A, Section 123(a), Section 123(a)(1), Section 123-1, Section 123.1
        pattern = r"Section\s+\d+[a-zA-Z]*(?:[-\.]\d+)?(?:\([a-z0-9]+\))*"
        citations = re.findall(pattern, text)

        # Deduplicate while preserving order
        unique_citations = []
        for c in citations:
            if c not in unique_citations:
                unique_citations.append(c)

        return unique_citations
