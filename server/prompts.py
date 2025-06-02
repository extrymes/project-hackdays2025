def language_grammar_prompt(message: str) -> str:
    return f"""
    ## Context

    Analyze this email message to detect potential phishing or fraud indicators.

    **Point to check:** Language & Grammar

    ## Check points

    **Check ONLY the following points:**
    1. Unusual or inconsistent writing style.
    2. Grammar and spelling errors.
    3. Awkward phrasing or unnatural language.
    4. Mixed languages or character sets.
    5. Machine-translated text indicators.
    6. Inconsistent formality levels.
    7. Poor sentence structure and flow.

    **If other signs of fraud are found, ignore them.**

    ## Expected response

    - Score: integer between 0-100, where 0 is most dangerous and 100 is completely safe.
    - Warnings: array of any suspicious elements or concerns found (one sentence each), or empty if none are found.

    **Include at most the 2 most important warnings!**

    **Your response MUST be valid JSON with EXACTLY this structure:**
    {{
        "score": <integer between 0-100>,
        "warnings": ["warning1", "warning2", ...],
    }}

    **DO NOT include any explanations outside the JSON structure.**

    ## Message
    {message}
    """

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
    - Warnings: array of any suspicious elements or concerns found (one sentence each), or empty if none are found.

    **Include at most the 2 most important warnings!**

    **Your response MUST be valid JSON with EXACTLY this structure:**
    {{
        "score": <integer between 0-100>,
        "warnings": ["warning1", "warning2", ...],
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
    - Warnings: array of any suspicious elements or concerns found (one sentence each), or empty if none are found.

    **Include at most the 2 most important warnings!**

    **Your response MUST be valid JSON with EXACTLY this structure:**
    {{
        "score": <integer between 0-100>,
        "warnings": ["warning1", "warning2", ...],
    }}

    **DO NOT include any explanations outside the JSON structure.**

    ## Message
    {message}
    """
