import os
import asyncio
import aiohttp
import turbopuffer as tpuf
from openai import AsyncOpenAI
from aiolimiter import AsyncLimiter
from tenacity import retry, wait_exponential, stop_after_attempt
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
NVIDIA_API_KEY = os.environ.get("NVIDIA_API_KEY")
TURBOPUFFER_API_KEY = os.environ.get("TURBOPUFFER_API_KEY")

# Initialization
if TURBOPUFFER_API_KEY:
    tpuf_client = tpuf.Turbopuffer(api_key=TURBOPUFFER_API_KEY)
    ns = tpuf_client.namespace("utp-global-data-v1")
else:
    ns = None

if NVIDIA_API_KEY:
    nvidia_client = AsyncOpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=NVIDIA_API_KEY
    )
else:
    nvidia_client = None

# Async Controls
rate_limiter = AsyncLimiter(50, 1)
semaphore = asyncio.Semaphore(100)

@retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
async def safe_fetch_api(url: str, session: aiohttp.ClientSession):
    async with semaphore:
        async with rate_limiter:
            async with session.get(url, timeout=10) as response:
                response.raise_for_status()
                # Return limited text to avoid overwhelming context
                text = await response.text()
                return text[:2000]

@retry(wait=wait_exponential(multiplier=1, min=2, max=30), stop=stop_after_attempt(5))
async def get_embedding(text: str):
    if not nvidia_client:
        return [0.0] * 1024 # Dummy embedding for dry-run
    response = await nvidia_client.embeddings.create(
        input=[text],
        model="nvidia/nv-embedqa-e5-v5",
        encoding_format="float",
        extra_body={"input_type": "passage", "truncate": "NONE"}
    )
    return response.data[0].embedding

@retry(wait=wait_exponential(multiplier=1, min=2, max=30), stop=stop_after_attempt(5))
async def generate_viral_question(api_name: str, raw_data: str):
    if not nvidia_client:
        return f"{api_name} Analysis", f"Generated question for {api_name} based on dry-run data."
        
    prompt = f"Analyze this raw data from {api_name}: {raw_data}\nGenerate a single viral prediction market question about the implications of this data."
    
    response = await nvidia_client.chat.completions.create(
        model="meta/llama-3.3-70b-instruct",
        messages=[{"role": "user", "content": prompt}],
        stream=False,
        temperature=0.7,
        max_tokens=150
    )
    question = response.choices[0].message.content.strip()
    return f"{api_name} Analysis", question

async def process_endpoint(api, session: aiohttp.ClientSession, supabase: Client):
    print(f"Polling {api['name']} at {api['url']}...")
    try:
        raw_text = await safe_fetch_api(api['url'], session)
        
        # 1. Compress to Vector
        print(f" -> Embedding data for {api['name']}")
        vector = await get_embedding(raw_text)
        
        # 2. Store in Turbopuffer (Batching in production, single here for clarity)
        if ns:
            ns.write(
                upsert_columns={
                    "id": [str(api['id'])],
                    "vector": [vector],
                    "text": [raw_text]
                },
                distance_metric="cosine_distance"
            )
        
        # 3. Generate Poll Question
        print(f" -> Generating Poll for {api['name']}")
        topic, question = await generate_viral_question(api['name'], raw_text)
        
        print(f" -> Result: {question}")
        
        # 4. Insert into Supabase
        if supabase:
            poll_data = {
                "source_id": api['id'],
                "topic": topic,
                "question": question,
                "context_data": {"raw_sample_len": len(raw_text)},
                "is_viral": True
            }
            supabase.table("polls").insert(poll_data).execute()
        
    except Exception as e:
        print(f" -> Failed to process {api['name']}: {e}")

async def main():
    print("Starting Global Intelligence Loop...")
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Warning: Running in Dry-Run mode (No Supabase connected).")
        supabase = None
        apis = [{"id": "1234", "name": "Test API", "url": "https://api.github.com/zen"}]
    else:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        response = supabase.table("api_sources").select("*").eq("status", "active").eq("auth_required", False).limit(5).execute()
        apis = response.data

    if not apis:
        print("No APIs to process.")
        return

    async with aiohttp.ClientSession() as session:
        tasks = [process_endpoint(api, session, supabase) for api in apis]
        await asyncio.gather(*tasks, return_exceptions=True)
        
    print("Loop Complete.")

if __name__ == "__main__":
    asyncio.run(main())
