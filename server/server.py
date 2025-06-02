from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from parse_email import extract_email_data
from transform import transform_email

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ou ["http://localhost:3000"] si tu veux restreindre
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.post("/transform_email")(transform_email)
