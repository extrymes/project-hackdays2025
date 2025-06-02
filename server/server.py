from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from analyze import extract_email_content, analyze_email_with_llm
from transform import transform_email

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ou ["http://localhost:3000"] si tu veux restreindre
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
app.post("/transform_email")(transform_email)
