from fastapi import Body, HTTPException
from email import policy
from email.parser import Parser
import base64
from typing import Dict, List, Any, Optional

def extract_email_data(raw_email: str = Body(..., media_type="text/plain")) -> Optional[Dict[str, Any]]:
    """Extract all email data from raw email text."""
    try:
        msg = Parser(policy=policy.default).parsestr(raw_email)

        # Extract basic headers
        email_data = {
            "headers": {
                "message_id": msg.get("Message-ID"),
                "from": msg.get("From"),
                "to": msg.get("To"),
                "cc": msg.get("CC"),
                "bcc": msg.get("BCC"),
                "subject": msg.get("Subject"),
                "date": msg.get("Date"),
                "reply_to": msg.get("Reply-To"),
                "in_reply_to": msg.get("In-Reply-To"),
                "references": msg.get("References"),
                "content_type": msg.get_content_type(),
                "content_disposition": msg.get("Content-Disposition"),
                "x_mailer": msg.get("X-Mailer"),
                "x_originating_ip": msg.get("X-Originating-IP"),
                "received": msg.get_all("Received"),
                "return_path": msg.get("Return-Path"),
                "delivered_to": msg.get("Delivered-To"),
                "authentication_results": msg.get("Authentication-Results"),
                "dkim_signature": msg.get("DKIM-Signature"),
                "spf": msg.get("Received-SPF"),
                "priority": msg.get("X-Priority") or msg.get("Priority"),
                "importance": msg.get("Importance"),
                "sensitivity": msg.get("Sensitivity")
            },
            "body": {
                "text": None,
                "html": None
            },
            "attachments": [],
            "metadata": {
                "is_multipart": msg.is_multipart(),
                "charset": msg.get_charset(),
                "content_transfer_encoding": msg.get("Content-Transfer-Encoding"),
                "mime_version": msg.get("MIME-Version"),
                "boundary": None
            }
        }

        # Extract boundary for multipart messages
        if msg.is_multipart():
            content_type_header = msg.get("Content-Type", "")
            if "boundary=" in content_type_header:
                boundary_start = content_type_header.find("boundary=") + 9
                boundary_end = content_type_header.find(";", boundary_start)
                if boundary_end == -1:
                    boundary_end = len(content_type_header)
                email_data["metadata"]["boundary"] = content_type_header[boundary_start:boundary_end].strip('"')

        # Extract body content and attachments
        if msg.is_multipart():
            for part in msg.walk():
                content_disposition = part.get("Content-Disposition", "")
                content_type = part.get_content_type()

                # Skip the multipart container itself
                if part.get_content_maintype() == "multipart":
                    continue

                # Extract text content
                if content_type == "text/plain" and "attachment" not in content_disposition:
                    if email_data["body"]["text"] is None:
                        email_data["body"]["text"] = part.get_content()

                # Extract HTML content
                elif content_type == "text/html" and "attachment" not in content_disposition:
                    if email_data["body"]["html"] is None:
                        email_data["body"]["html"] = part.get_content()

                # Extract attachments
                elif "attachment" in content_disposition or part.get_filename():
                    attachment_data = {
                        "filename": part.get_filename(),
                        "content_type": content_type,
                        "content_disposition": content_disposition,
                        "content_id": part.get("Content-ID"),
                        "size": len(part.get_payload(decode=True)) if part.get_payload(decode=True) else 0,
                        "content_transfer_encoding": part.get("Content-Transfer-Encoding"),
                        "content": None
                    }

                    # Get attachment content
                    payload = part.get_payload(decode=True)
                    if payload:
                        # Encode binary content as base64 for JSON serialization
                        attachment_data["content"] = base64.b64encode(payload).decode('utf-8')

                    email_data["attachments"].append(attachment_data)
        else:
            # Handle non-multipart messages
            content_type = msg.get_content_type()
            if content_type == "text/plain":
                email_data["body"]["text"] = msg.get_content()
            elif content_type == "text/html":
                email_data["body"]["html"] = msg.get_content()

        # Clean up None values in headers
        email_data["headers"] = {k: v for k, v in email_data["headers"].items() if v is not None}

        # Add additional metadata
        email_data["metadata"]["total_parts"] = len(list(msg.walk())) if msg.is_multipart() else 1
        email_data["metadata"]["attachment_count"] = len(email_data["attachments"])
        email_data["metadata"]["has_text_body"] = email_data["body"]["text"] is not None
        email_data["metadata"]["has_html_body"] = email_data["body"]["html"] is not None

        return email_data

    except Exception as e:
        print(f"Error when extracting email data: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to parse email: {str(e)}")
