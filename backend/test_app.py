from fastapi import FastAPI
import os

app = FastAPI()


@app.get("/")
def root():
    return {
        "status": "ok",
        "port": os.getenv("PORT", "8080"),
        "supabase_url_set": bool(os.getenv("SUPABASE_URL")),
        "supabase_key_set": bool(os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
    }


@app.get("/health")
def health():
    return {"healthy": True}
