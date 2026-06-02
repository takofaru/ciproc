import base64
import io
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from PIL import Image

from app.models.project import (
    Project, ProjectCreate, ProjectUpdate, ProjectSummary
)
from app import db

router = APIRouter(prefix="/projects", tags=["projects"])


def _make_thumbnail(image_bytes: bytes, size: int = 240) -> str:
    """Return base64 JPEG thumbnail."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img.thumbnail((size, size))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=80)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


# ── List ──────────────────────────────────────────────────────
@router.get("/", response_model=list[ProjectSummary])
def list_projects():
    return db.list_projects()


# ── Create ────────────────────────────────────────────────────
@router.post("/", response_model=Project)
def create_project(body: ProjectCreate):
    project = Project(
        name=body.name,
        description=body.description,
    )
    return db.save_project(project)


# ── Get ───────────────────────────────────────────────────────
@router.get("/{project_id}", response_model=Project)
def get_project(project_id: str):
    project = db.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


# ── Update (metadata + node graph) ───────────────────────────
@router.patch("/{project_id}", response_model=Project)
def update_project(project_id: str, body: ProjectUpdate):
    project = db.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if body.name is not None:
        project.name = body.name
    if body.description is not None:
        project.description = body.description
    if body.nodes is not None:
        project.nodes = body.nodes
    if body.edges is not None:
        project.edges = body.edges

    project.updated_at = datetime.utcnow()
    return db.save_project(project)


# ── Delete ────────────────────────────────────────────────────
@router.delete("/{project_id}")
def delete_project(project_id: str):
    if not db.delete_project(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    return {"ok": True}


# ── Upload source image ───────────────────────────────────────
@router.post("/{project_id}/image")
async def upload_image(project_id: str, file: UploadFile = File(...)):
    project = db.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    content = await file.read()

    # Validate it's an image
    try:
        Image.open(io.BytesIO(content)).verify()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    # Save source
    img_path = db.get_source_image_path(project_id)
    img_path.parent.mkdir(exist_ok=True)

    # Save as JPEG
    img = Image.open(io.BytesIO(content)).convert("RGB")
    img.save(img_path, format="JPEG", quality=95)

    # Generate thumbnail
    project.thumbnail = _make_thumbnail(content)
    project.has_image = True
    project.updated_at = datetime.utcnow()
    db.save_project(project)

    return {"ok": True, "thumbnail": project.thumbnail}


# ── Get source image ──────────────────────────────────────────
@router.get("/{project_id}/image")
def get_image(project_id: str):
    path = db.get_source_image_path(project_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="No image for this project")
    return FileResponse(str(path), media_type="image/jpeg")


# ── Duplicate project ─────────────────────────────────────────
@router.post("/{project_id}/duplicate", response_model=Project)
def duplicate_project(project_id: str):
    source = db.get_project(project_id)
    if not source:
        raise HTTPException(status_code=404, detail="Project not found")

    new_project = Project(
        name=f"{source.name} (copy)",
        description=source.description,
        nodes=source.nodes,
        edges=source.edges,
        thumbnail=source.thumbnail,
        has_image=source.has_image,
    )
    db.save_project(new_project)

    # Copy image if exists
    src_img = db.get_source_image_path(project_id)
    if src_img.exists():
        import shutil
        dst_img = db.get_source_image_path(new_project.id)
        dst_img.parent.mkdir(exist_ok=True)
        shutil.copy2(src_img, dst_img)

    return new_project
