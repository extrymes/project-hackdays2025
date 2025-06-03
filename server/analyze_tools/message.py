import os
from fastapi import HTTPException
from analyze_tools.prompts import language_grammar_prompt, ton_manipulation_prompt, sensitive_info_request_prompt
from analyze_tools.model import call_model

class MessageAnalyzer:
    def __init__(self):
        self.model = "albert-small"

    def analyze_language_grammar(self, message: str) -> dict[str, int | list[str]] | None:
        """
        Function to analyze message and detect potential phishing or fraud indicators.
        Point to check: Language & Grammar
        """

        response = call_model(self.model, language_grammar_prompt(message))
        print("Response:", response)
        if response:
            return response
        return None

    def analyze_ton_manipulation(self, message: str) -> dict[str, int | list[str]] | None:
        """
        Function to analyze message and detect potential phishing or fraud indicators.
        Point to check: Tone / Manipulation
        """

        response = call_model(self.model, ton_manipulation_prompt(message))
        if response:
            return response
        return None

    def analyze_sensitive_info_request(self, message: str) -> dict[str, int | list[str]] | None:
        """
        Function to analyze message and detect potential phishing or fraud indicators.
        Point to check: Sensitive information request
        """

        response = call_model(self.model, sensitive_info_request_prompt(message))
        if response:
            return response
        return None

if __name__ == "__main__":
    print("\n🔍 Message Security Analyzer")
    analyzer = MessageAnalyzer()

    html_input = input("Enter HTML content or file path: ").strip()
    if os.path.exists(html_input):
        with open(html_input, 'r', encoding='utf-8') as f:
            html_input = f.read()

    print("\nAnalyzing...")
    result = analyzer.analyze_language_grammar(html_input)

    print(f"\n📊 Message Suspicion Score: {result['score']} / 100")
    print(f"⚠️ Warnings: {result['warnings'] if result['warnings'] else 'No warnings.'}")
