from fastapi import Body, HTTPException
import os
from analyze_tools.model import LLMClient
from analyze_tools.prompts import recommendations_prompt

def generate_recommendations(warnings, email_content: str, email_sender: str, score: int):
    """
    Generates recommendations based on the provided warnings.
    """
    recommendations = []
    if not warnings:
        return recommendations

    try:
        llm_client = LLMClient()
        
        prompt = recommendations_prompt(warnings, email_content, email_sender, score)

        recommendations_text = llm_client.call_text(
            prompt=prompt,
            model=os.environ.get('LLM_MODEL'),  # Update to a Groq model
            temperature=0.7,
            max_tokens=150
        )
        
        if not recommendations_text:
            return []

        raw_lines = recommendations_text.split('\n')
        recommendations = [line.strip() for line in raw_lines if line.strip()]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating recommendations: {str(e)}")

    return recommendations