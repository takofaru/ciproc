from pydantic import BaseModel, Field
from typing import Any
from datetime import datetime
import uuid


class NodeData(BaseModel):
    id: str
    type: str
    position: dict[str, float]
    data: dict[str, Any] = {}


class EdgeData(BaseModel):
    id: str
    source: str
    target: str


class ProjectCreate(BaseModel):
    name: str
    description: str = ""


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    nodes: list[NodeData] | None = None
    edges: list[EdgeData] | None = None


class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    nodes: list[NodeData] = []
    edges: list[EdgeData] = []
    has_image: bool = False
    thumbnail: str | None = None   # base64 thumbnail ~200px
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ProjectSummary(BaseModel):
    """Lightweight version for dashboard listing"""
    id: str
    name: str
    description: str
    has_image: bool
    thumbnail: str | None
    created_at: datetime
    updated_at: datetime
