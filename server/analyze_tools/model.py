import os
import json
from fastapi import HTTPException
from openai import OpenAI

def call_model(model: str, prompt: str) -> dict[str, int | list[str]] | None:
    # Use OpenAI client with the specified API
    api_key = os.environ.get('API_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="API key not found in environment variables")

    client = OpenAI(
        base_url='https://albert.api.etalab.gouv.fr/v1',
        api_key=api_key,
    )

    try:
        # Make API call
        response = client.chat.completions.create(
            model=model,
            response_format={ "type": "json_object" },
            messages=[
                {"role": "system", "content": "You are a cybersecurity expert specializing in email phishing detection. Always respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=2000
        )

        # Retrieve and parse the response
        response_content = response.choices[0].message.content

        try:
            # Parse the JSON response
            analysis_result = json.loads(response_content)
            return analysis_result
        except json.JSONDecodeError as json_error:
            print(f"Error parsing JSON response: {json_error}")
            return None

    except Exception as e:
        print(f"Error during LLM analysis: {e}")
        return None
