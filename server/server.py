from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from parse_email import extract_email_data
from analyze import EmailSecurityAnalyzer
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

app.post("/receive-email/")(email_handler)
app.post("/transform_email")(transform_email)
