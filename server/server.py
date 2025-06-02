from fastapi import FastAPI, Body
from analyze import extract_email_content, analyze_email_with_llm

app = FastAPI()

async def email_handler(raw_email: str = Body(..., media_type="text/plain")):
    # Parse the raw email
    email_data = extract_email_content(raw_email)
    
    if not email_data:
        raise Exception(status_code=400, detail="Failed to parse email content")
    
    # Analyze with LLM
    analysis = analyze_email_with_llm(email_data)
    
    # Extract the requested information
    response = {
        "score": analysis["score"],
        "warnings": analysis["warnings"],
        "recommendations": analysis["recommendations"]
    }
    
    return response

app.post("/receive-email/")(email_handler)
