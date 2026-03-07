import unittest
from unittest.mock import MagicMock, patch
from summarizer.pipeline import SummarizationPipeline

class TestSummarizationPipeline(unittest.TestCase):
    def setUp(self):
        self.mock_client = MagicMock()
        self.pipeline = SummarizationPipeline(ollama_client=self.mock_client)

    def test_insufficient_text_client_side(self):
        """Test that short text returns INSUFFICIENT_SOURCE_TEXT without calling AI."""
        result = self.pipeline.summarize("Too short")
        self.assertEqual(result, {"error": "INSUFFICIENT_SOURCE_TEXT"})
        self.mock_client.generate.assert_not_called()

    def test_successful_summarization(self):
        """Test successful summarization and citation extraction."""
        mock_ai_response = {
            "response": "TL;DR: This bill improves AI safety. Key changes: 1. New standards (Section 5). 2. Annual reports (Section 12(b))."
        }
        self.mock_client.generate.return_value = mock_ai_response
        self.mock_client.get_response_text.return_value = mock_ai_response["response"]

        bill_text = "This is a long bill text that should be sufficient for summarization. " * 5
        result = self.pipeline.summarize(bill_text)

        self.assertIn("summary", result)
        self.assertIn("citations", result)
        self.assertEqual(result["citations"], ["Section 5", "Section 12(b)"])
        self.assertIn("TL;DR", result["summary"])

    def test_insufficient_text_ai_side_json(self):
        """Test that AI returning INSUFFICIENT_SOURCE_TEXT JSON is handled."""
        mock_ai_response = {
            "response": '{"error": "INSUFFICIENT_SOURCE_TEXT"}'
        }
        self.mock_client.generate.return_value = mock_ai_response
        self.mock_client.get_response_text.return_value = mock_ai_response["response"]

        bill_text = "Some text that is long enough to pass client check but AI finds it lacking." * 5
        result = self.pipeline.summarize(bill_text)

        self.assertEqual(result, {"error": "INSUFFICIENT_SOURCE_TEXT"})

    def test_citation_extraction_variations(self):
        """Test extraction of various citation formats."""
        text = "According to Section 1 and Section 23(a), as well as Section 101(b)(2), Section 123A, Section 456-1, and Section 789.2."
        citations = self.pipeline.extract_citations(text)
        self.assertEqual(citations, [
            "Section 1",
            "Section 23(a)",
            "Section 101(b)(2)",
            "Section 123A",
            "Section 456-1",
            "Section 789.2"
        ])

    def test_duplicate_citations(self):
        """Test that duplicate citations are removed."""
        text = "Section 5 says X. Later, Section 5 says Y."
        citations = self.pipeline.extract_citations(text)
        self.assertEqual(citations, ["Section 5"])

if __name__ == "__main__":
    unittest.main()
