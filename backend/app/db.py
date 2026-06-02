"""
Simple JSON file-based persistence.
Each project is stored as /uploads/{project_id}/project.json
Source image stored as /uploads/{project_id}/source.jpg
"""
import json
import os
from pathlib import Path
from datetime import datetime

from app.models.project import Project

UPLOAD_ROOT = Path(__file__).parent.parent / "uploads"
UPLOAD_ROOT.mkdir(exist_ok=True)


def _project_dir(project_id: str) -> Path:
    return UPLOAD_ROOT / project_id


def _project_file(project_id: str) -> Path:
    return _project_dir(project_id) / "project.json"


def _to_json(project: Project) -> dict:
    d = project.model_dump()
    d["created_at"] = d["created_at"].isoformat()
    d["updated_at"] = d["updated_at"].isoformat()
    return d


def _from_json(data: dict) -> Project:
    data["created_at"] = datetime.fromisoformat(data["created_at"])
    data["updated_at"] = datetime.fromisoformat(data["updated_at"])
    return Project(**data)


def list_projects() -> list[Project]:
    projects = []
    for d in sorted(UPLOAD_ROOT.iterdir()):
        pf = d / "project.json"
        if pf.exists():
            with open(pf) as f:
                projects.append(_from_json(json.load(f)))
    projects.sort(key=lambda p: p.updated_at, reverse=True)
    return projects


def get_project(project_id: str) -> Project | None:
    pf = _project_file(project_id)
    if not pf.exists():
        return None
    with open(pf) as f:
        return _from_json(json.load(f))


def save_project(project: Project) -> Project:
    d = _project_dir(project.id)
    d.mkdir(exist_ok=True)
    with open(_project_file(project.id), "w") as f:
        json.dump(_to_json(project), f, indent=2)
    return project


def delete_project(project_id: str) -> bool:
    import shutil
    d = _project_dir(project_id)
    if d.exists():
        shutil.rmtree(d)
        return True
    return False


def get_source_image_path(project_id: str) -> Path:
    return _project_dir(project_id) / "source.jpg"
