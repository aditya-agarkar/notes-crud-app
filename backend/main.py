import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables from .env (local dev only)
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

print("SUPABASE_URL:", SUPABASE_URL)
print("SUPABASE_SERVICE_ROLE_KEY:", SUPABASE_KEY[:6] + "..." if SUPABASE_KEY else None)

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables")

sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(title="Notes API")

# Allow frontend to call backend (CORS)
origins = [os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class NoteIn(BaseModel):
    title: str
    content: str | None = None

@app.get("/notes")
async def list_notes():
    try:
        resp = sb.table("notes").select("*").order("created_at", desc=True).execute()
        return resp.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/notes/{note_id}")
async def get_note(note_id: int):
    try:
        resp = sb.table("notes").select("*").eq("id", note_id).single().execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Not found")
        return resp.data
    except Exception as e:
        raise HTTPException(status_code=404, detail="Not found")

@app.post("/notes", status_code=201)
async def create_note(payload: NoteIn):
    try:
        resp = sb.table("notes").insert(payload.dict()).execute()
        return resp.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/notes/{note_id}")
async def update_note(note_id: int, payload: NoteIn):
    try:
        resp = sb.table("notes").update(payload.dict()).eq("id", note_id).execute()
        return resp.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/notes/{note_id}", status_code=204)
async def delete_note(note_id: int):
    try:
        resp = sb.table("notes").delete().eq("id", note_id).execute()
        return {}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
