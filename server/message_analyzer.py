from fastapi import HTTPException
from server.analyze.prompts import language_grammar_prompt, ton_manipulation_prompt, sensitive_info_request_prompt
from model import call_model

def analyze_language_grammar(message: str) -> dict[str, int | list[str]] | None:
    """
    Function to analyze message and detect potential phishing or fraud indicators.
    Point to check: Language & Grammar
    """

    response = call_model("albert-small", language_grammar_prompt(message))
    print("Response:", response)
    if response:
        return response
    return None

def analyze_ton_manipulation(message: str) -> dict[str, int | list[str]] | None:
    """
    Function to analyze message and detect potential phishing or fraud indicators.
    Point to check: Tone / Manipulation
    """

    response = call_model("albert-small", ton_manipulation_prompt(message))
    if response:
        return response
    return None

def analyze_sensitive_info_request(message: str) -> dict[str, int | list[str]] | None:
    """
    Function to analyze message and detect potential phishing or fraud indicators.
    Point to check: Sensitive information request
    """

    response = call_model("albert-small", sensitive_info_request_prompt(message))
    if response:
        return response
    return None
