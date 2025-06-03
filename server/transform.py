# transform.py

import uuid
from pathlib import Path
from fastapi import Body
from email.message import EmailMessage
from email.utils import format_datetime, formataddr
from datetime import datetime, timezone
from parse_email import extract_email_data
from analyze import EmailSecurityAnalyzer

# Directory where .eml files will be stored
MAILS_DIR = Path("./mails")
MAILS_DIR.mkdir(parents=True, exist_ok=True)

async def analyze_email(raw_email: str = Body(..., media_type="text/plain")):
    # Parse the raw email
    email_data = extract_email_data(raw_email)

    if not email_data:
        raise Exception(status_code=400, detail="Failed to parse email content")

    analyzer = EmailSecurityAnalyzer()
    analysis = analyzer.analyze_email(email_data)

    # Extract the requested information
    response = {
        "score": analysis["score"],
        "warnings": analysis["warnings"],
        "recommendations": analysis["recommendations"]
    }

    return response

def format_address_list(address_list):
    """
    Takes a list in the form [['Name', 'address@example'], …]
    and returns an RFC-2822 formatted string like 'Name <address@example>, ...'.
    Returns None if the list is empty.
    """
    if not address_list:
        return None

    formatted = []
    for pair in address_list:
        if len(pair) == 2:
            name, addr = pair
            formatted.append(formataddr((name, addr)))
        else:
            # If only the raw address is provided
            formatted.append(pair[0])
    return ", ".join(formatted)


async def handle_email(payload: dict = Body(...)):
    """
    Transforms the received JSON into a complete .eml file, including original headers,
    date based on sent_date (in milliseconds), text and HTML parts, and saves it to
    ./mails/<uuid>.eml. Returns the UUID of the created file.
    """
    msg = EmailMessage()

    # 1) Address formatting
    formatted_from  = format_address_list(payload.get("from", []))
    formatted_to    = format_address_list(payload.get("to", []))
    formatted_cc    = format_address_list(payload.get("cc", []))
    formatted_bcc   = format_address_list(payload.get("bcc", []))
    formatted_reply = format_address_list(payload.get("reply_to", []))

    if formatted_from:
        msg["From"] = formatted_from
    if formatted_to:
        msg["To"] = formatted_to
    if formatted_cc:
        msg["Cc"] = formatted_cc
    if formatted_bcc:
        msg["Bcc"] = formatted_bcc
    if formatted_reply:
        msg["Reply-To"] = formatted_reply

    # 2) Subject
    subject = payload.get("subject", "")
    msg["Subject"] = subject  # UTF-8 encoding will be automatic

    # 3) Date (in milliseconds)
    sent_ms = payload.get("sent_date")
    if sent_ms:
        # Convert to seconds, then explicitly to UTC and finally to local timezone
        dt = datetime.fromtimestamp(sent_ms / 1000.0, tz=timezone.utc).astimezone()
        msg["Date"] = format_datetime(dt)
    else:
        # If not provided, use current local date
        print("now")
        now = datetime.now(timezone.utc).astimezone()
        msg["Date"] = format_datetime(now)

    # 4) Original headers (SKIP "From", "To", "Subject", "Date", "MIME-Version")
    original_headers = payload.get("headers", {})
    for key, value in original_headers.items():
        key_lower = key.lower()
        if key_lower in {"from", "to", "subject", "date", "mime-version"}:
            continue

        if isinstance(value, list):
            for v in value:
                msg.add_header(key, v)
        else:
            msg[key] = value

    # 5) Plain text body
    text_body = payload.get("text_preview", "")
    msg.set_content(text_body)

    # 6) HTML part (if there is a 'text/html' content_type in attachments)
    for attach in payload.get("attachments", []):
        ct = attach.get("content_type", "")
        if "html" in ct.lower():
            html_content = attach.get("content", "")
            msg.add_alternative(html_content, subtype="html")
            break

    # 7) Ensure no subpart has its own "MIME-Version"
    #    (only the global header should include it)
    for part in msg.iter_parts():
        if part.get("MIME-Version"):
            del part["MIME-Version"]

    # 8) Convert to bytes (the global MIME-Version header will be automatically generated)
    eml_bytes = msg.as_bytes()

    # 9) Generate a unique ID and write to ./mails
    unique_id = uuid.uuid4().hex
    filename = f"{unique_id}.eml"
    filepath = MAILS_DIR / filename

    with open(filepath, "wb") as f:
        f.write(eml_bytes)
    with open(filepath, "r") as f:
        raw_email = f.read()
    
    # Call the handler
    analysis = await analyze_email(raw_email)
    
    # Delete the file after processing (commented out for now)
    filepath.unlink()
    print("Analysis: ", analysis)
    
    return {
        "status": "success",
        "message": analysis
    }
