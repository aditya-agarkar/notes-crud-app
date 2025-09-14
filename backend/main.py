import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables from .env (local dev only)
# In production (Fly.io), secrets are set as environment variables directly
try:
    load_dotenv()
except:
    pass  # Ignore if .env doesn't exist in production

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

print(f"SUPABASE_URL: {SUPABASE_URL}")
print(f"SUPABASE_KEY: {SUPABASE_KEY[:6] + '...' if SUPABASE_KEY else 'None'}")
print(f"PORT: {os.getenv('PORT', '8080')}")
print("Starting app...")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Missing Supabase credentials!")
    raise RuntimeError("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables")

try:
    sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("Supabase client created successfully")
except Exception as e:
    print(f"ERROR creating Supabase client: {e}")
    raise

app = FastAPI(title="Notes API")

@app.get("/")
async def root():
    return {"message": "Notes API is running!"}

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
    tags: list[str] = []

class Tag(BaseModel):
    id: int
    name: str
    color: str

@app.get("/notes")
async def list_notes():
    try:
        # Get notes with their tags
        resp = sb.table("notes").select("""
            *,
            note_tags(
                tags(id, name, color)
            )
        """).order("created_at", desc=True).execute()
        
        # Format the response to include tags array
        notes = []
        for note in resp.data:
            note_data = {**note}
            note_data['tags'] = [nt['tags'] for nt in note.get('note_tags', [])]
            note_data.pop('note_tags', None)
            notes.append(note_data)
            
        return notes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/notes/{note_id}")
async def get_note(note_id: int):
    try:
        return await get_note_with_tags(note_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail="Not found")

async def get_note_with_tags(note_id: int):
    """Get a single note with its tags"""
    try:
        resp = sb.table("notes").select("""
            *,
            note_tags(
                tags(id, name, color)
            )
        """).eq("id", note_id).single().execute()
        
        if not resp.data:
            raise HTTPException(status_code=404, detail="Note not found")
        
        # Format the response to include tags array
        note_data = {**resp.data}
        note_data['tags'] = [nt['tags'] for nt in resp.data.get('note_tags', [])]
        note_data.pop('note_tags', None)
        
        return note_data
    except Exception as e:
        raise HTTPException(status_code=404, detail="Not found")

@app.post("/notes", status_code=201)
async def create_note(payload: NoteIn):
    try:
        # Create the note
        note_data = {"title": payload.title, "content": payload.content}
        resp = sb.table("notes").insert(note_data).execute()
        note = resp.data[0]
        
        # Handle tags
        if payload.tags:
            await _associate_tags_with_note(note['id'], payload.tags)
            
        return await get_note_with_tags(note['id'])
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

async def _associate_tags_with_note(note_id: int, tag_names: list[str]):
    """Associate tags with a note, creating tags if they don't exist"""
    for tag_name in tag_names:
        if not tag_name.strip():
            continue
            
        tag_name = tag_name.strip().lower()
        
        # Get or create tag
        existing_tag = sb.table("tags").select("id").eq("name", tag_name).execute()
        
        if existing_tag.data:
            tag_id = existing_tag.data[0]['id']
        else:
            new_tag = sb.table("tags").insert({"name": tag_name}).execute()
            tag_id = new_tag.data[0]['id']
        
        # Create note-tag association (ignore if already exists)
        try:
            sb.table("note_tags").insert({
                "note_id": note_id, 
                "tag_id": tag_id
            }).execute()
        except:
            pass  # Ignore duplicate associations

@app.put("/notes/{note_id}")
async def update_note(note_id: int, payload: NoteIn):
    try:
        # Update the note (excluding tags from the update)
        note_data = {"title": payload.title, "content": payload.content}
        resp = sb.table("notes").update(note_data).eq("id", note_id).execute()
        
        if not resp.data:
            raise HTTPException(status_code=404, detail="Note not found")
        
        # Clear existing tag associations
        sb.table("note_tags").delete().eq("note_id", note_id).execute()
        
        # Handle new tags
        if payload.tags:
            await _associate_tags_with_note(note_id, payload.tags)
            
        # Return updated note with tags
        return await get_note_with_tags(note_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/notes/{note_id}", status_code=204)
async def delete_note(note_id: int):
    try:
        # Delete note-tag associations first (cascade should handle this)
        sb.table("note_tags").delete().eq("note_id", note_id).execute()
        
        # Delete the note
        resp = sb.table("notes").delete().eq("id", note_id).execute()
        return {}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Tag management endpoints
@app.get("/tags")
async def list_tags():
    try:
        resp = sb.table("tags").select("*").order("name").execute()
        return resp.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tags/suggestions")
async def get_tag_suggestions(q: str = ""):
    """Get tag suggestions for autocomplete"""
    try:
        if not q:
            # Return most used tags
            resp = sb.rpc("get_popular_tags", {"limit_count": 10}).execute()
            return resp.data if resp.data else []
        
        # Search tags by name
        resp = sb.table("tags").select("*").ilike("name", f"%{q.lower()}%").limit(10).execute()
        return resp.data
    except Exception as e:
        # Fallback to simple search
        try:
            resp = sb.table("tags").select("*").order("name").execute()
            filtered = [tag for tag in resp.data if q.lower() in tag['name'].lower()][:10]
            return filtered
        except:
            return []
