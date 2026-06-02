from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import projects

app = FastAPI(
    title="Mini Photoshop API",
    description="Project management backend for Mini Photoshop Ciprog",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)


@app.get("/health")
def health():
    return {"status": "ok"}
