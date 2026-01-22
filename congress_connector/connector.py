import configparser
import requests
import time
from ratelimit import limits, sleep_and_retry
from tinydb import TinyDB, Query

# --- Configuration ---
CONFIG_FILE = 'config.ini'
DB_FILE = 'congress_data.json'
API_BASE_URL = 'https://api.congress.gov/v3/'
# Rate limit: 5000 calls per hour = ~1.38 calls per second.
# We'll be conservative and stick to 1 call per second.
CALLS = 1
RATE_LIMIT_PERIOD = 1 # in seconds

# --- Database Setup ---
db = TinyDB(DB_FILE)
raw_payloads = db.table('raw_payloads')
Record = Query()

# --- API Interaction ---
def get_api_key():
    """Reads the API key from the config file."""
    config = configparser.ConfigParser()
    config.read(CONFIG_FILE)
    return config['congress_api']['api_key']

@sleep_and_retry
@limits(calls=CALLS, period=RATE_LIMIT_PERIOD)
def make_api_request(url, api_key):
    """Makes a rate-limited API request."""
    headers = {'X-Api-Key': api_key}
    response = requests.get(url, headers=headers)
    response.raise_for_status()  # Raise an exception for bad status codes
    return response.json()

def process_page(data):
    """Processes a page of results, storing new records."""
    new_records_added = 0
    for item in data:
        # Use the 'url' as a unique identifier for idempotency
        if not raw_payloads.contains(Record.url == item['url']):
            raw_payloads.insert(item)
            new_records_added += 1
    return new_records_added

def fetch_data(endpoint, api_key):
    """Fetches all data from a given endpoint, handling pagination."""
    url = f"{API_BASE_URL}{endpoint}"
    while url:
        print(f"Fetching data from: {url}")
        try:
            response_data = make_api_request(url, api_key)

            # The actual data is in a key that is the plural of the endpoint name (e.g., 'bills')
            data_key = endpoint.split('/')[0] + 's' # get the base endpoint name and pluralize
            if data_key in response_data:
                new_records = process_page(response_data[data_key])
                print(f"Added {new_records} new records.")
            else:
                print(f"Warning: Could not find key '{data_key}' in the response.")

            # Get the next page URL
            url = response_data.get('pagination', {}).get('next')

        except requests.exceptions.RequestException as e:
            print(f"Error making API request: {e}")
            break
        except Exception as e:
            print(f"An unexpected error occurred: {e}")
            break

# --- Main Execution ---
if __name__ == "__main__":
    api_key = get_api_key()
    if api_key == 'YOUR_API_KEY_HERE':
        print("Please replace 'YOUR_API_KEY_HERE' with your actual API key in config.ini")
    else:
        # Example: Fetch all bills
        fetch_data('bill', api_key)
