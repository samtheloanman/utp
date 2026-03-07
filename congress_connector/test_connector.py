import unittest
from unittest.mock import patch, MagicMock
import sqlite3
import os
import json
from connector import CongressConnector

class TestCongressConnector(unittest.TestCase):

    def setUp(self):
        """Set up a temporary database for testing."""
        self.test_db_file = 'test_congress_data.db'
        self.connector = CongressConnector(db_file=self.test_db_file)

    def tearDown(self):
        """Remove the temporary database file."""
        if os.path.exists(self.test_db_file):
            os.remove(self.test_db_file)

    @patch('connector.CongressConnector._make_api_request')
    def test_fetch_endpoint_pagination(self, mock_make_api_request):
        """Test that the connector correctly handles pagination and storage."""
        # Mock the API responses for two pages of data
        mock_make_api_request.side_effect = [
            {
                'bills': [{'url': 'url1', 'title': 'Bill 1'}, {'url': 'url2', 'title': 'Bill 2'}],
                'pagination': {'next': 'next_url'}
            },
            {
                'bills': [{'url': 'url3', 'title': 'Bill 3'}, {'url': 'url4', 'title': 'Bill 4'}],
                'pagination': {'next': None}
            }
        ]

        self.connector.fetch_endpoint('bill')

        # Check that all four records were inserted into the SQLite database
        with sqlite3.connect(self.test_db_file) as conn:
            cursor = conn.execute('SELECT COUNT(*) FROM raw_payloads')
            count = cursor.fetchone()[0]
            self.assertEqual(count, 4)

            # Verify content of one record
            cursor = conn.execute('SELECT data FROM raw_payloads WHERE url = ?', ('url1',))
            data = json.loads(cursor.fetchone()[0])
            self.assertEqual(data['title'], 'Bill 1')

    @patch('connector.CongressConnector._make_api_request')
    def test_idempotency(self, mock_make_api_request):
        """Test that the connector is idempotent and doesn't insert duplicate records."""
        # Manually insert a record that will also be in the mock API response
        with sqlite3.connect(self.test_db_file) as conn:
            conn.execute('INSERT INTO raw_payloads (url, data) VALUES (?, ?)', ('url1', '{"title": "Existing"}'))
            conn.commit()

        mock_make_api_request.return_value = {
            'bills': [{'url': 'url1', 'title': 'Bill 1'}, {'url': 'url2', 'title': 'Bill 2'}],
            'pagination': {'next': None}
        }

        self.connector.fetch_endpoint('bill')

        # Check that only one new record was inserted (total should be 2)
        with sqlite3.connect(self.test_db_file) as conn:
            cursor = conn.execute('SELECT COUNT(*) FROM raw_payloads')
            count = cursor.fetchone()[0]
            self.assertEqual(count, 2)

if __name__ == '__main__':
    unittest.main()
