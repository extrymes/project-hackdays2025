from fastapi import Body, HTTPException
import os
from analyze_tools.model import LLMClient

def generate_recommendations(warnings):
    """
    Generates recommendations based on the provided warnings.
    """
    recommendations = []
    if not warnings:
        return recommendations

    try:
        llm_client = LLMClient()
        
        prompt = f"""
        Act as an email security advisor. For each warning below:

        1. Generate immediate action item in French
        2. Use imperative tense (e.g., "Ne cliquez pas...")
        3. Keep it concise 
        4. Focus on urgent user actions only
        5. Keep it as simple as possible
        6. Do NOT take grammar or spelling error into account nor mixed languages
        7. Do NOT give similar adivce more than once

        Format EXACTLY like this for each warning:
        [French recommendation without numbering ]

        The warnings generated are from the content of the email, some warnings don't necessitate advising
        Warnings received:
        {warnings}
        """

        recommendations_text = llm_client.call_text(
            prompt=prompt,
            model="llama3-8b-8192",  # Update to a Groq model
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