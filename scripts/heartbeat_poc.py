#!/usr/bin/env python3
import json
import urllib.request
import urllib.error
import urllib.parse
from pathlib import Path
import os

LEGISCAN_API_KEY = "9586c3839f2a17aa20e786b0c1364bea"
OLLAMA_ENDPOINT = "http://localhost:11434/api/generate"
# Output directory inside the Next.js app to be served or imported
OUTPUT_DIR = Path(__file__).parent.parent / "src" / "data" / "legiscan"

def fetch_california_bills():
    """Fetch recent bills from LegiScan for California."""
    url = f"https://api.legiscan.com/?key={LEGISCAN_API_KEY}&op=getSearch&state=CA&query=tax"
    print(f"Fetching from LegiScan: {url}")
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            return data.get("searchresult", {})
    except Exception as e:
        print(f"Error fetching LegiScan data: {e}")
        return {}

def summarize_with_ollama(text):
    """Use local Ollama Gemma to summarize the bill text."""
    prompt = f"Summarize this legislative bill in one paragraph and provide 2 FAQs in JSON format with keys 'summary' and 'faqs' (which is a list of dicts with 'question' and 'answer'):\n\n{text}"
    
    payload = {
        "model": "gemma", 
        "prompt": prompt,
        "stream": False,
        "format": "json"
    }
    
    try:
        req = urllib.request.Request(OLLAMA_ENDPOINT, method="POST")
        req.add_header("Content-Type", "application/json")
        with urllib.request.urlopen(req, data=json.dumps(payload).encode("utf-8")) as response:
            result = json.loads(response.read().decode())
            return json.loads(result.get("response", "{}"))
    except Exception as e:
        print(f"Error calling Ollama: {e}")
        return {"summary": "Summarization failed or Ollama not running.", "faqs": []}

def run_pipeline():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # 1. Extraction
    results = fetch_california_bills()
    bills = []
    
    # Process top 3 bills for POC
    for i in range(3):
        key = str(i)
        if key in results:
            bill_info = results[key]
            print(f"Processing Bill: {bill_info.get('bill_number')} - {bill_info.get('title')}")
            
            # 2. Transformation
            summary_data = summarize_with_ollama(bill_info.get("title", ""))
            
            bill_data = {
                "bill_id": bill_info.get("bill_id"),
                "bill_number": bill_info.get("bill_number"),
                "title": bill_info.get("title"),
                "state": "CA",
                "summary": summary_data.get("summary", ""),
                "faqs": summary_data.get("faqs", [])
            }
            bills.append(bill_data)
            
            # 3. Loading
            file_path = OUTPUT_DIR / f"{bill_info.get('bill_number')}.json"
            file_path.write_text(json.dumps(bill_data, indent=2))
            print(f"Saved: {file_path}")

if __name__ == "__main__":
    run_pipeline()
