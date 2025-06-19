import os
from fastapi import HTTPException
from analyze_tools.prompts import ton_manipulation_prompt, sensitive_info_request_prompt
from analyze_tools.model import LLMClient

class MessageAnalyzer:
    def __init__(self):
        self.model = "llama3-8b-8192"  # Update to a Groq model
        self.llm_client = LLMClient()

    def analyze_ton_manipulation(self, message: str) -> dict[str, int | list[str]] | None:
        """
        Function to analyze message and detect potential phishing or fraud indicators.
        Point to check: Tone / Manipulation
        """
        response = self.llm_client.call_json(
            prompt=ton_manipulation_prompt(message),
            model=self.model
        )
        return response

    def analyze_sensitive_info_request(self, message: str) -> dict[str, int | list[str]] | None:
        """
        Function to analyze message and detect potential phishing or fraud indicators.
        Point to check: Sensitive information request
        """
        response = self.llm_client.call_json(
            prompt=sensitive_info_request_prompt(message),
            model=self.model
        )
        return response

if __name__ == "__main__":
    print("\n🔍 Message Security Analyzer")
    analyzer = MessageAnalyzer()

    html_input = input("Enter HTML content or file path: ").strip()
    if os.path.exists(html_input):
        with open(html_input, 'r', encoding='utf-8') as f:
            html_input = f.read()

    print("\nAnalyzing...")
    result = analyzer.analyze_sensitive_info_request(html_input)

    print(f"\n📊 Message Suspicion Score: {result['score']} / 100")
    print(f"⚠️ Warnings: {result['warnings'] if result['warnings'] else 'No warnings.'}")
