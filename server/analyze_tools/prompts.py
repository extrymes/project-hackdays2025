from typing import Dict, Any

def ton_manipulation_prompt(message: str) -> str:
    return f"""
    ## Context

    Analyze this email message to detect potential phishing or fraud indicators.

    **Point to check:** Tone / Manipulation

    ## Check points

    **Check ONLY the following points:**
    1. Urgency or pressure tactics
    2. Threatening language or intimidation
    3. Emotional manipulation (fear, greed, curiosity)
    4. Excessive flattery or overly friendly tone
    5. Authority impersonation or name-dropping
    6. Unrealistic promises or offers
    7. Guilt-tripping or obligation creation

    **If other signs of fraud are found, ignore them.**

    ## Expected response

    - Score: integer between 0-100, where 0 is most dangerous and 100 is completely safe.
    - Warnings: Any suspicious element or concern found (one sentence), or empty if none are found.

    **Include only the most important warning and only if it is serious, or empty if none are found.!**

    **Your response MUST be valid JSON in FRENCH with EXACTLY this structure:**
    {{
        "score": <integer between 0-100>,
        "warnings": ["warning1"],
    }}

    **DO NOT include any explanations outside the JSON structure.**

    ## Message
    {message}
    """

def sensitive_info_request_prompt(message: str) -> str:
    return f"""
    ## Context

    Analyze this email message to detect potential phishing or fraud indicators.

    **Point to check:** Sensitive information request

    ## Check points
    **Check ONLY the following points:**
    1. Requests for login credentials or passwords
    2. Requests for financial information (credit card, bank details)
    3. Requests for personal identifying information (SSN, ID numbers)
    4. Requests for confidential business information
    5. Requests to verify account details
    6. Requests for security questions/answers
    7. Requests for access codes or PIN numbers

    **If other signs of fraud are found, ignore them.**

    ## Expected response

    - Score: integer between 0-100, where 0 is most dangerous and 100 is completely safe.
    - Warnings: Any suspicious element or concern found (one sentence), or empty if none are found.

    **Include only the most important warning and only if it is serious, or empty if none are found.!**

    **Your response MUST be valid JSON in FRENCH with EXACTLY this structure:**
    {{
        "score": <integer between 0-100>,
        "warnings": ["warning1"],
    }}

    **DO NOT include any explanations outside the JSON structure.**

    ## Message
    {message}
    """

def links_check_prompt(link: Dict[any, Any]):
    return f"""
            SECURITY TASK: Analyze this URL for security risks. Return ONLY a risk score.

            URL: {link['url']}
            Domain: {link.get('domain', 'N/A')}
            Display Text: {link.get('text', 'N/A')}

            Tolerate:
            - Secure URLs (https://)
            - Legitimate domains (e.g., google.com, paypal.com, etc.)
            - Social media links (e.g., x.com/user, linkedin.com/user, etc.)
            - Personal domains (e.g., johnsmith.com, janedoe.org, etc.)

            Be vigilant for:
            - URL shorteners (bit.ly, tinyurl, etc)
            - IP addresses in URLs
            - Typosquatting domains
            - Link text not matching URL destination
            - Suspicious TLDs
            - Deceptive paths

            Respond with ONLY a valid JSON object:
            {{"risk_score": <integer between 0-100, 0 is most dangerous, 100 is completely safe>}}

            Lower risk score = more dangerous.

            Example :
            https://x.com/Alex should return a high risk score, while
            http://freegiftxxx.com should return a low risk score.
            """
