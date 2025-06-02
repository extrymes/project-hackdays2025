from fastapi import Body, HTTPException
from parse_email import extract_email_data
from analyze import EmailSecurityAnalyzer
import os
from openai import OpenAI
import json


def extract_email_content(raw_email):
    """Extract email content from raw email text."""
    try:
        msg = Parser(policy=policy.default).parsestr(raw_email)
        
        # Extract basic email information
        email_data = {
            "from": msg.get("From", ""),
            "to": msg.get("To", ""),
            "subject": msg.get("Subject", ""),
            "date": msg.get("Date", ""),
            "body": "",
            "links": []
        }
        
        # Extract body content - simplified from analyze.py
        if msg.is_multipart():
            for part in msg.iter_parts():
                content_type = part.get_content_type()
                if content_type == "text/plain":
                    email_data["body"] += part.get_content()
        else:
            if msg.get_content_type() in ("text/plain" ,"text/html"):
                email_data["body"] = msg.get_content()
        return email_data
    
    except Exception as e:
        print(f"Error extracting email content: {e}")
        return None

def analyze_email_with_llm(email_data):
    """Analyze email content with an LLM to detect phishing attempts."""

    # Use OpenAI client with the specified API
    api_key = os.environ.get('API_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="API key not found in environment variables")

    client = OpenAI(
        base_url='https://albert.api.etalab.gouv.fr/v1',
        api_key=api_key,
    )

    # Create prompt for LLM
    prompt = f"""
    Analyze this email for potential phishing or fraud indicators.

    Email details:
    From: {email_data['headers']['from']}
    To: {email_data['headers']['to']}
    Subject: {email_data['headers']['subject']}
    Date: {email_data['headers']['date']}

    Body:
    {email_data['body']['html'][:4000]}

    Links found in email:
    {', '.join(email_data.get('links', [])[:20])}

    Please analyze this email for signs of phishing or fraud, including:
    1. Suspicious sender addresses (mismatched domains, lookalike domains)
    2. Urgency or threatening language
    3. Grammar and spelling errors
    4. Requests for sensitive information
    5. Suspicious links (mismatched display text and URL, suspicious domains)
    6. Impersonation attempts of trusted entities
    7. Unusual requests or offers that seem too good to be true

    Your response MUST be valid JSON with EXACTLY this structure:
    {{
        "score": <integer between 0-100, where 0 is most dangerous and 100 is completely safe>,
        "warnings": ["warning1", "warning2", ...] (list any suspicious elements or concerns found, or empty if none are found),
        "recommendations": "Your recommendation on how to handle this email"
    }}

    DO NOT include any explanations outside the JSON structure.
    """

    try:
        # Make API call
        response = client.chat.completions.create(
            model="albert-large",
            messages=[
                {"role": "system", "content": "You are a cybersecurity expert specializing in email phishing detection. Always respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=2000
        )

        # Get raw response content
        raw_content = response.choices[0].message.content

        # Clean the response before parsing JSON
        clean_content = raw_content.strip()
        if clean_content.startswith("```json"):
            clean_content = clean_content[7:]
        if clean_content.endswith("```"):
            clean_content = clean_content[:-3]
        clean_content = clean_content.strip()

        # Extract the LLM's response
        analysis = json.loads(clean_content)

        # Verify that the required fields are in the response
        required_fields = ["score", "warnings", "recommendations"]
        for field in required_fields:
            if field not in analysis:
                raise ValueError(f"Missing required field in response: {field}")

        return analysis

    except Exception as e:
        print(f"Error during LLM analysis: {e}")
        return {
            "score": 0,
            "warnings": ["Error during analysis", str(e)],
            "recommendations": "Error occurred during analysis. Please try again or analyze manually."
        }

async def email_handler(raw_email: str = Body(..., media_type="text/plain")):
    # Parse the raw email
    email_data = extract_email_data(raw_email)

    if not email_data:
        raise Exception(status_code=400, detail="Failed to parse email content")

    analyzer = EmailSecurityAnalyzer()
    analysis =  analyzer.analyze_email(email_data)

    # Extract the requested information
    response = {
        "score": analysis["score"],
        "warnings": analysis["warnings"],
        "recommendations": analysis["recommendations"]
    }

    return response

