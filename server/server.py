from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from parse_email import extract_email_data
from handle_email import email_handler

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ou ["http://localhost:3000"] si tu veux restreindre
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.post("/receive_email")(email_handler)
