from fastapi import Body, HTTPException
import os
from openai import OpenAI
import json

def generate_recommendations(warnings):
    """
    Generates recommendations based on the provided warnings.
    """
    recommendations = []
    if not warnings:
        return recommendations

    api_key = os.environ.get('API_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="API key not found in environment variables")

    client = OpenAI(
        base_url='https://albert.api.etalab.gouv.fr/v1',
        api_key=api_key,
    )

    prompt = f"""
    Act as an email security advisor. For each warning below:

    1. Generate immediate action item in French
    2. Use imperative tense (e.g., "Ne cliquez pas...")
    3. Keep it concise (< 10 words)
    4. Focus on urgent user actions only
    5. Keep it as simple as possible
    6. Do NOT take grammar or spelling error into account nor mixed languages

    Format EXACTLY like this for each warning:
    [French recommendation without numbering ]

    The warnings generated are from the content of the email, some warnings don't necessitate advising
    Warnings received:
    {warnings}
    """

    try:
        response = client.chat.completions.create(
            model="albert-large",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=150,
            temperature=0.7
        )

        recommendations_text = response.choices[0].message.content.strip()
        raw_lines = recommendations_text.split('\n')

        recommendations = [line.strip() for line in raw_lines if line.strip()]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating recommendations: {str(e)}")

    return recommendations