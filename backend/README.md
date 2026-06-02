# Mini Photoshop — FastAPI Backend

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

Server runs at http://localhost:8000
API docs at http://localhost:8000/docs

## Structure

uploads/
  {project_id}/
    project.json   — metadata + node graph
    source.jpg     — original uploaded image
