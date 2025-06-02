language_grammar_prompt = f"""
    Analyze this email message to detect fraud indicators by checking language and grammar.

    Message:
    {message}

    Please analyze this email for indications of fraud by checking language and grammar, including:
    1. Unusual or inconsistent writing style
    2. Grammar and spelling errors
    3. Awkward phrasing or unnatural language
    4. Mixed languages or character sets
    5. Machine-translated text indicators
    6. Inconsistent formality levels
    7. Poor sentence structure and flow

    Your response MUST be valid JSON with EXACTLY this structure:
    {{
        "score": <integer between 0-100, where 0 is most dangerous and 100 is completely safe>,
        "warnings": ["warning1", "warning2", ...] (list any suspicious elements or concerns found, or empty if none are found),
    }}

    DO NOT include any explanations outside the JSON structure.
    """

tone_manipulatiom_prompt = f"""
    Analyze this email message to detect fraud indicators by checking tone and signs of manipulation.

    Message:
    {message}

    Please analyze this email for indications of fraud by checking tone and signs of manipulation, including:
    1. Urgency or pressure tactics
    2. Threatening language or intimidation
    3. Emotional manipulation (fear, greed, curiosity)
    4. Excessive flattery or overly friendly tone
    5. Authority impersonation or name-dropping
    6. Unrealistic promises or offers
    7. Guilt-tripping or obligation creation

    Your response MUST be valid JSON with EXACTLY this structure:
    {{
        "score": <integer between 0-100, where 0 is most dangerous and 100 is completely safe>,
        "warnings": ["warning1", "warning2", ...] (list any suspicious elements or concerns found, or empty if none are found),
    }}

    DO NOT include any explanations outside the JSON structure.
    """

request_sensitive_info_prompt = f"""
    Analyze this email message to detect fraud indicators by checking request of sensitive information.

    Message:
    {message}

    Please analyze this email for indications of fraud by checking request of sensitive information, including:
    1. Requests for login credentials or passwords
    2. Requests for financial information (credit card, bank details)
    3. Requests for personal identifying information (SSN, ID numbers)
    4. Requests for confidential business information
    5. Requests to verify account details
    6. Requests for security questions/answers
    7. Requests for access codes or PIN numbers

    Your response MUST be valid JSON with EXACTLY this structure:
    {{
        "score": <integer between 0-100, where 0 is most dangerous and 100 is completely safe>,
        "warnings": ["warning1", "warning2", ...] (list any suspicious elements or concerns found, or empty if none are found),
    }}

    DO NOT include any explanations outside the JSON structure.
    """
