import os
import re
import asyncio
import aiohttp
from aiolimiter import AsyncLimiter
from tenacity import retry, wait_exponential, stop_after_attempt
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

# Limit to 50 requests per second
rate_limiter = AsyncLimiter(50, 1)
# Limit to 100 concurrent open connections
semaphore = asyncio.Semaphore(100)

@retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
async def safe_fetch(url: str, session: aiohttp.ClientSession):
    async with semaphore:
        async with rate_limiter:
            async with session.get(url, timeout=10) as response:
                response.raise_for_status()
                return await response.text()

async def fetch_public_apis():
    print("Fetching master list of Public APIs from GitHub...")
    url = "https://raw.githubusercontent.com/public-apis/public-apis/master/README.md"
    
    async with aiohttp.ClientSession() as session:
        try:
            content = await safe_fetch(url, session)
        except Exception as e:
            print(f"Failed to fetch public APIs: {e}")
            return []

    apis = []
    current_category = "General"
    
    for line in content.split('\n'):
        line = line.strip()
        if line.startswith('### '):
            current_category = line.replace('### ', '').strip()
            continue
            
        if line.startswith('|') and not line.startswith('|---') and not line.startswith('| API'):
            parts = [p.strip() for p in line.split('|')[1:-1]]
            if len(parts) >= 4:
                api_match = re.search(r'\[(.*?)\]\((.*?)\)', parts[0])
                if api_match:
                    name = api_match.group(1)
                    api_url = api_match.group(2)
                    description = parts[1]
                    auth = parts[2]
                    
                    auth_required = True if auth.lower() not in ['no', ''] else False
                    
                    apis.append({
                        "name": name,
                        "url": api_url,
                        "description": description,
                        "category": current_category,
                        "auth_required": auth_required,
                        "status": "active"
                    })
    return apis

def seed_supabase(apis):
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Warning: SUPABASE credentials not set. Dry-run mode active.")
        print(f"Would have inserted {len(apis)} APIs into Supabase.")
        return

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print(f"Attempting to seed {len(apis)} APIs into Supabase...")
    
    batch_size = 100
    success_count = 0
    
    for i in range(0, len(apis), batch_size):
        batch = apis[i:i+batch_size]
        try:
            supabase.table("api_sources").upsert(batch, on_conflict="url").execute()
            success_count += len(batch)
            print(f"Successfully inserted batch {i//batch_size + 1} ({len(batch)} records)")
        except Exception as e:
            print(f"Error inserting batch: {e}")
            
    print(f"Finished! Successfully seeded {success_count} API sources.")

async def main():
    discovered_apis = await fetch_public_apis()
    print(f"Found {len(discovered_apis)} APIs.")
    if discovered_apis:
        # Cap at 1000 for initial run
        target_apis = discovered_apis[:1000]
        seed_supabase(target_apis)

if __name__ == "__main__":
    asyncio.run(main())
