import configparser
import json
import logging
import sqlite3
import requests
from ratelimit import limits, sleep_and_retry

# --- Logging Configuration ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('CongressConnector')

class CongressConnector:
    def __init__(self, config_file='config.ini', db_file='congress_data.db'):
        self.config_file = config_file
        self.db_file = db_file
        self.api_base_url = 'https://api.congress.gov/v3/'
        self.api_key = self._get_api_key()
        self._init_db()

    def _get_api_key(self):
        """Reads the API key from the config file."""
        config = configparser.ConfigParser()
        config.read(self.config_file)
        try:
            return config['congress_api']['api_key']
        except KeyError:
            logger.warning(f"API key not found in {self.config_file}. Using placeholder.")
            return 'YOUR_API_KEY_HERE'

    def _init_db(self):
        """Initializes the SQLite database."""
        with sqlite3.connect(self.db_file) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS raw_payloads (
                    url TEXT PRIMARY KEY,
                    data TEXT,
                    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            conn.commit()

    @sleep_and_retry
    @limits(calls=1, period=1)
    def _make_api_request(self, url):
        """Makes a rate-limited API request."""
        headers = {'X-Api-Key': self.api_key}
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()

    def _store_record(self, record):
        """Stores a single record in the database if it doesn't exist."""
        url = record.get('url')
        if not url:
            logger.warning("Record missing URL, skipping.")
            return False

        with sqlite3.connect(self.db_file) as conn:
            # Idempotency: skip if URL already exists
            cursor = conn.execute('SELECT 1 FROM raw_payloads WHERE url = ?', (url,))
            if cursor.fetchone():
                return False

            conn.execute(
                'INSERT INTO raw_payloads (url, data) VALUES (?, ?)',
                (url, json.dumps(record))
            )
            conn.commit()
            return True

    def _extract_data(self, response_data, endpoint):
        """Extracts the data list from the API response."""
        # Try pluralized key
        data_key = endpoint.split('/')[0] + 's'
        if data_key in response_data:
            return response_data[data_key]

        # Try exact endpoint name
        if endpoint in response_data:
            return response_data[endpoint]

        # Try common keys if above fail
        for key in ['results', 'items', 'data']:
            if key in response_data:
                return response_data[key]

        return None

    def fetch_endpoint(self, endpoint):
        """Fetches all data from a given endpoint, handling pagination."""
        url = f"{self.api_base_url}{endpoint}"

        while url:
            logger.info(f"Fetching: {url}")
            try:
                response_data = self._make_api_request(url)
                data_list = self._extract_data(response_data, endpoint)

                if data_list is not None:
                    new_count = 0
                    for item in data_list:
                        if self._store_record(item):
                            new_count += 1
                    logger.info(f"Processed page. Added {new_count} new records.")
                else:
                    logger.warning(f"No data found for endpoint '{endpoint}' in response.")

                url = response_data.get('pagination', {}).get('next')
            except Exception as e:
                logger.error(f"Error during fetch: {e}")
                break

if __name__ == "__main__":
    connector = CongressConnector()
    if connector.api_key == 'YOUR_API_KEY_HERE':
        print("Please set your API key in config.ini")
    else:
        connector.fetch_endpoint('bill')
