"""
Local-disk file upload utility.

Files are stored under backend/uploads/<subdir>/<uuid>.<ext> and served
back at /files/<subdir>/<filename> (StaticFiles mount in app/main.py).
The DB stores that /files/... path in the *_url columns.

Deliberately behind one small function so a later swap to S3/R2 changes
this file only, nothing else (decision from discovery: local disk now,
object storage later if needed).

NOTE for deployment (Render/Railway): attach a persistent disk mounted at
backend/uploads/ — without it, uploaded files vanish on every redeploy.
"""

import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

UPLOAD_ROOT = Path(__file__).resolve().parent.parent.parent / "uploads"

# extension -> allowed content (photos for seal/slip/passbook, PDFs for 2A/4B docs)
_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
_DOC_EXTS = _IMAGE_EXTS | {".pdf"}

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


def save_upload(file: UploadFile, subdir: str, allow_pdf: bool = False) -> str:
    """Validate + persist an upload; returns the /files/... URL path."""
    ext = Path(file.filename or "").suffix.lower()
    allowed = _DOC_EXTS if allow_pdf else _IMAGE_EXTS
    if ext not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{ext or 'unknown'}' not allowed. Allowed: {sorted(allowed)}",
        )

    content = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File larger than 10 MB",
        )

    target_dir = UPLOAD_ROOT / subdir
    target_dir.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}{ext}"
    (target_dir / name).write_bytes(content)
    return f"/files/{subdir}/{name}"
