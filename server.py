from fastapi import FastAPI, Body

app = FastAPI()

async def email_handler(raw_email: str = Body(..., media_type="text/plain")):
    return {
        "message": f"E-mail reçu ({len(raw_email)} bytes)",
        "preview": raw_email[:20]
    }

app.post("/receive-email/")(email_handler)
