"""
Cloudinary-backed file upload utility.

Uploads go to Cloudinary (folder = subdir) and the DB stores the
returned secure_url in the *_url columns.

Local disk was the original approach, but Render's free tier has an
ephemeral filesystem — every uploaded file was wiped on every container
restart (confirmed live: a passbook photo uploaded the same morning
404'd). Deliberately kept behind this one small function with an
unchanged signature so no caller (farmers.py, lab_samples.py,
weighing.py) needed to change.

Validation (type, size) happens BEFORE the upload call, same as before
— a rejected file never reaches Cloudinary. If the Cloudinary call
itself fails, this raises HTTPException rather than returning anything:
a URL for a file that didn't actually upload is exactly the silent-loss
bug this replaces.
"""

from pathlib import Path

import cloudinary
import cloudinary.uploader
from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)

# extension -> allowed content (photos for seal/slip/passbook, PDFs for 2A/4B docs)
_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
_DOC_EXTS = _IMAGE_EXTS | {".pdf"}

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


def save_upload(file: UploadFile, subdir: str, allow_pdf: bool = False) -> str:
    """Validate, then upload to Cloudinary; returns the secure_url."""
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

    # PDFs aren't images — Cloudinary needs resource_type "raw" for them, or
    # it mishandles/rejects them under "image". Everything else here is an
    # already-validated image extension.
    resource_type = "raw" if ext == ".pdf" else "image"

    try:
        result = cloudinary.uploader.upload(
            content,
            folder=subdir,
            resource_type=resource_type,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not upload file — the storage service did not respond. Please try again.",
        ) from exc

    return result["secure_url"]
