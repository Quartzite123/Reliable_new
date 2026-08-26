"""
User management — Admin only, except GET /users/me (any authenticated user).

POST   /api/v1/users        — create a worker account (R53: admin sets email,
                              initial password, role; no self-signup)
GET    /api/v1/users        — list all users
GET    /api/v1/users/me     — the calling user's own profile
PATCH  /api/v1/users/{id}   — change role, reset password, activate/deactivate
                              (deactivation is the "soft delete" — R54 audit
                              trail means user rows are never deleted)

There is intentionally no DELETE endpoint: every audit FK in the system
(created_by / inspected_by / ...) points at users.id, so removing a user row
would destroy the accountability chain (R30, R54).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.core.deps import get_current_user, require_role
from app.core.enums import UserRole
from app.core.security import hash_password
from app.models.user import User
from app.schemas.user import UserCreate, UserRead, UserUpdate

router = APIRouter()

_admin_only = Depends(require_role())  # require_role() with no args = Admin only


@router.get("/me", response_model=UserRead)
def read_me(user: User = Depends(get_current_user)) -> User:
    return user


@router.post(
    "",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[_admin_only],
)
def create_user(body: UserCreate, db: Session = Depends(get_db)) -> User:
    email = body.email.lower()
    existing = db.scalar(select(User).where(User.email == email))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )
    user = User(
        email=email,
        name=body.name,
        password_hash=hash_password(body.password),
        role=body.role,
        active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("", response_model=list[UserRead], dependencies=[_admin_only])
def list_users(db: Session = Depends(get_db)) -> list[User]:
    return list(db.scalars(select(User).order_by(User.id)))


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    body: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role()),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if body.active is False and user.id == admin.id:
        # An admin locking themselves out is unrecoverable without DB access.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account",
        )

    if body.role is not None:
        user.role = body.role
    if body.active is not None:
        user.active = body.active
    if body.password is not None:
        user.password_hash = hash_password(body.password)

    db.commit()
    db.refresh(user)
    return user
