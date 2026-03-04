from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.services.search_service import search_service
from app.services.ingest_service import ingestion_service


app = FastAPI()


# -----------------------------
# CORS CONFIGURATION
# -----------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow frontend access
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------
# REQUEST MODEL
# -----------------------------

class QuestionRequest(BaseModel):
    question: str
    user_department: str
    session_id: str


# -----------------------------
# STARTUP EVENT
# -----------------------------

@app.on_event("startup")
def startup_event():
    ingestion_service.scan_and_sync_documents()


# -----------------------------
# ASK ENDPOINT
# -----------------------------

@app.post("/ask")
def ask_question(request: QuestionRequest):

    result = search_service.search(
        question=request.question,
        user_department=request.user_department,
        session_id=request.session_id
    )

    return result