# Congress.gov Connector

This is an idempotent, rate-limited connector for the Congress.gov API.

## Setup

1.  **Get an API Key:** Sign up for an API key at [api.data.gov](https://api.data.gov/signup/).
2.  **Configuration:** Create a `config.ini` file in the `congress_connector` directory with the following content:
    ```ini
    [congress_api]
    api_key = YOUR_API_KEY_HERE
    ```
3.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

## Usage

Run the connector script:
```bash
python connector.py
```

By default, it fetches data from the `bill` endpoint. You can modify the `__main__` block in `connector.py` to fetch other endpoints.

## Features

- **Idempotency:** Tracks fetched records via their unique URLs in a SQLite database to prevent duplicates.
- **Rate Limiting:** Respects Congress.gov's rate limits (conservative 1 request/second).
- **Raw Payloads:** Stores the full JSON payload for each record.
- **SQLite Storage:** Uses a local SQLite database (`congress_data.db`) for efficient storage and querying.

## Testing

Run the tests using:
```bash
python test_connector.py
```
