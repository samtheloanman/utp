import unittest
from unittest.mock import patch, MagicMock
from tinydb import TinyDB, Query
import os
import connector

class TestCongressConnector(unittest.TestCase):

    def setUp(self):
        """Set up a temporary database for testing."""
        self.test_db_file = 'test_congress_data.json'
        connector.DB_FILE = self.test_db_file
        self.db = TinyDB(self.test_db_file)
        self.raw_payloads = self.db.table('raw_payloads')
        connector.db = self.db
        connector.raw_payloads = self.raw_payloads

    def tearDown(self):
        """Remove the temporary database file."""
        self.db.close()
        os.remove(self.test_db_file)

    @patch('connector.make_api_request')
    def test_fetch_data_pagination(self, mock_make_api_request):
        """Test that the connector correctly handles pagination."""
        # Mock the API responses for two pages of data
        mock_make_api_request.side_effect = [
            {
                'bills': [{'url': 'url1'}, {'url': 'url2'}],
                'pagination': {'next': 'next_url'}
            },
            {
                'bills': [{'url': 'url3'}, {'url': 'url4'}],
                'pagination': {'next': None}
            }
        ]

        connector.fetch_data('bill', 'fake_api_key')

        # Check that all four records were inserted into the database
        self.assertEqual(len(self.raw_payloads), 4)

    @patch('connector.make_api_request')
    def test_idempotency(self, mock_make_api_request):
        """Test that the connector is idempotent and doesn't insert duplicate records."""
        # Insert a record that will also be in the mock API response
        self.raw_payloads.insert({'url': 'url1'})

        mock_make_api_request.return_value = {
            'bills': [{'url': 'url1'}, {'url': 'url2'}],
            'pagination': {'next': None}
        }

        connector.fetch_data('bill', 'fake_api_key')

        # Check that only one new record was inserted
        self.assertEqual(len(self.raw_payloads), 2)

if __name__ == '__main__':
    unittest.main()
