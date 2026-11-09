import shutil
import json
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Depends
from sqlalchemy.orm import Session
from app.config import settings
from app.engine.duckdb_engine import db_engine
from app.db.session import get_db
from app.db.models import Conversation
from app.models.schemas import UploadResponse, TableSchema

router = APIRouter(prefix="/api", tags=["Data Ingestion & Schemas"])

@router.post("/upload", response_model=UploadResponse)
async def upload_csv_files(
    files: list[UploadFile] = File(...),
    conversation_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Accepts one or more CSV files, registers them into DuckDB, associates them with the conversation,
    and returns schemas and statistics.
    """
    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No files uploaded.")

    registered_tables: list[TableSchema] = []

    for file in files:
        if not file.filename.lower().endswith(".csv"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file format: '{file.filename}'. Only CSV files are supported."
            )

        safe_name = Path(file.filename).name
        dest_path = settings.UPLOAD_DIR / safe_name

        try:
            with open(dest_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to save file: {str(e)}")

        table_name = Path(safe_name).stem.replace("-", "_").replace(" ", "_")
        try:
            schema = db_engine.register_csv(table_name=table_name, file_path=dest_path)
            registered_tables.append(schema)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error parsing and registering CSV '{safe_name}': {str(e)}"
            )

    # Associate tables with conversation if provided
    if conversation_id:
        conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        new_names = [t.table_name for t in registered_tables]
        if not conv:
            conv = Conversation(
                id=conversation_id,
                title=f"Analysis of {new_names[0]}" if new_names else "New Analysis",
                active_tables=json.dumps(new_names)
            )
            db.add(conv)
            db.commit()
        else:
            existing = conv.get_tables_list()
            new_tables = list(dict.fromkeys(existing + new_names))
            conv.set_tables_list(new_tables)
            db.commit()

    return UploadResponse(
        success=True,
        message=f"Successfully uploaded and profiled {len(registered_tables)} CSV table(s).",
        tables=registered_tables
    )

@router.get("/tables", response_model=list[TableSchema])
async def list_tables(conversation_id: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Returns profiles and preview rows for registered tables.
    If conversation_id is provided, filters tables scoped to that conversation.
    """
    db_engine.auto_register_uploads()
    all_tables = db_engine.get_registered_tables_info()
    if conversation_id:
        conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if conv:
            allowed = set(conv.get_tables_list())
            matched = [t for t in all_tables if t.table_name in allowed]
            if matched:
                return matched
    return all_tables

@router.post("/load-samples", response_model=UploadResponse)
async def load_sample_datasets():
    """
    Registers the included sample datasets into DuckDB virtual tables.
    """
    candidates = [
        Path("sample_data"),
        Path(__file__).resolve().parent.parent.parent.parent / "sample_data",
        Path(__file__).resolve().parent.parent.parent / "sample_data",
        settings.BASE_DIR.parent / "sample_data",
        settings.UPLOAD_DIR
    ]
    
    sample_dir = None
    for c in candidates:
        if c.exists() and (c / "sales_transactions.csv").exists():
            sample_dir = c
            break

    if not sample_dir:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sample datasets directory ('sample_data') not found."
        )

    sample_files = [
        ("sales_transactions", sample_dir / "sales_transactions.csv"),
        ("customers", sample_dir / "customers.csv"),
        ("products", sample_dir / "products.csv"),
    ]

    registered_tables: list[TableSchema] = []
    for table_name, file_path in sample_files:
        if file_path.exists():
            schema = db_engine.register_csv(table_name=table_name, file_path=file_path)
            registered_tables.append(schema)

    return UploadResponse(
        success=True,
        message=f"Loaded and profiled {len(registered_tables)} sample dataset(s).",
        tables=registered_tables
    )
