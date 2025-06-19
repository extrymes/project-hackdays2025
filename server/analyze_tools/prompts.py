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

    ## Scoring guide
    
    - 0-20: Extremely manipulative, multiple severe red flags
    - 21-40: Highly manipulative, clear red flags
    - 41-60: Moderately manipulative
    - 61-80: Slightly suspicious tone
    - 81-100: Normal, professional tone without manipulation

    ## Expected response

    **IMPORTANT: Your response MUST be in FRENCH and formatted as valid JSON.**

    - Score: integer between 0-100, where 0 is most dangerous and 100 is completely safe.
    - Warnings: Array with only the most serious warning found, or empty array if none found.

    **Your response MUST be valid JSON in FRENCH with EXACTLY this structure:**
    {{
        "score": <integer between 0-100>,
        "warnings": ["warning in French"] or []
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

    ## Scoring guide
    
    - 0-20: Explicitly requests highly sensitive information (passwords, financial details)
    - 21-40: Indirectly solicits sensitive information
    - 41-60: Requests information that could be sensitive in context
    - 61-80: Asks for information but not particularly sensitive
    - 81-100: No requests for any personal information

    ## Expected response

    **IMPORTANT: Your response MUST be in FRENCH and formatted as valid JSON.**

    - Score: integer between 0-100, where 0 is most dangerous and 100 is completely safe.
    - Warnings: Array with only the most serious warning found, or empty array if none found.

    **Your response MUST be valid JSON in FRENCH with EXACTLY this structure:**
    {{
        "score": <integer between 0-100>,
        "warnings": ["warning in French"] or []
    }}

    **DO NOT include any explanations outside the JSON structure.**

    ## Message
    {message}
    """

def links_check_prompt(link: Dict[str, Any]) -> str:
    return f"""
    ## Context

    SECURITY TASK: Analyze this URL for safety.

    URL: {link['url']}
    Domain: {link.get('domain', 'N/A')}
    Display Text: {link.get('text', 'N/A')}

    ## Scoring guide
    
    - 0-20: Highly dangerous (typosquatting, URL shorteners, IP addresses in URLs)
    - 21-40: Suspicious (misleading text vs actual URL, unusual TLDs)
    - 41-60: Uncertain safety (unfamiliar but not obviously malicious)
    - 61-80: Mostly safe (legitimate but not major domains)
    - 81-100: Completely safe (major trusted domains, proper HTTPS)

    ## Safety criteria

    Safe URLs (higher scores):
    - Secure URLs (https://)
    - Legitimate domains (e.g., google.com, paypal.com, etc.)
    - Social media links (e.g., x.com/user, linkedin.com/user, etc.)
    - Personal domains with proper structure

    Dangerous URLs (lower scores):
    - URL shorteners (bit.ly, tinyurl, etc)
    - IP addresses in URLs
    - Typosquatting domains (e.g., am4zon.com, twiitter.com, g00gle.com)
    - Link text not matching URL destination
    - Suspicious TLDs
    - Deceptive paths
    - Misspelled domains mimicking legitimate sites

    **IMPORTANT: Your response MUST be in FRENCH and formatted as valid JSON.**

    **Respond with ONLY a valid JSON object:**
    {{
        "safety_score": <integer between 0-100>,
        "warnings": ["warning in French"] or []
    }}
    """
