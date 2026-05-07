from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Generator, Optional

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
    select,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker


DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("GARUDA_DATABASE_URL") or "sqlite:///./garuda.db"
ACCESS_TOKEN_COOKIE = "garuda_access_token"
REFRESH_TOKEN_COOKIE = "garuda_refresh_token"
ACCESS_TOKEN_TTL_MINUTES = int(os.getenv("GARUDA_ACCESS_TOKEN_MINUTES", "30"))
REFRESH_TOKEN_TTL_DAYS = int(os.getenv("GARUDA_REFRESH_TOKEN_DAYS", "14"))
COOKIE_SECURE = os.getenv("GARUDA_COOKIE_SECURE", "false").lower() == "true"
JWT_SECRET_PATH = Path(__file__).resolve().with_name(".garuda_jwt_secret")


def _load_jwt_secret() -> str:
    env_secret = os.getenv("JWT_SECRET") or os.getenv("GARUDA_JWT_SECRET")
    if env_secret:
        return env_secret
    if JWT_SECRET_PATH.exists():
        return JWT_SECRET_PATH.read_text(encoding="utf-8").strip()

    secret = secrets.token_urlsafe(32)
    JWT_SECRET_PATH.write_text(secret, encoding="utf-8")
    return secret


JWT_SECRET = _load_jwt_secret()


def _normalize_database_url(url: str) -> str:
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


engine = create_engine(_normalize_database_url(DATABASE_URL), future=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def normalize_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    password_hash: Mapped[str] = mapped_column(Text)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True)
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
    )
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    analyses: Mapped[list[Analysis]] = relationship(back_populates="user")
    refresh_tokens: Mapped[list[RefreshToken]] = relationship(back_populates="user")


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    location_name: Mapped[str] = mapped_column(String(255), index=True)
    preset_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    before_date: Mapped[str] = mapped_column(String(32))
    after_date: Mapped[str] = mapped_column(String(32))
    resolution_m: Mapped[float] = mapped_column(Float)
    zoom_level: Mapped[str] = mapped_column(String(64))
    mode: Mapped[str] = mapped_column(String(32), default="rgb")
    demo_mode: Mapped[bool] = mapped_column(Boolean, default=False)
    change_percentage: Mapped[float] = mapped_column(Float)
    changed_area_sq_km: Mapped[float] = mapped_column(Float)
    football_fields: Mapped[int] = mapped_column(Integer)
    severity: Mapped[str] = mapped_column(String(32))
    dominant_change: Mapped[str] = mapped_column(String(64))
    thumbnail_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    result_json: Mapped[Dict[str, Any]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    user: Mapped[User] = relationship(back_populates="analyses")
    report: Mapped[Optional[Report]] = relationship(back_populates="analysis", uselist=False)


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    analysis_id: Mapped[str] = mapped_column(ForeignKey("analyses.id"), unique=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    payload_json: Mapped[Dict[str, Any]] = mapped_column(JSON)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    analysis: Mapped[Analysis] = relationship(back_populates="report")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(Text, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship(back_populates="refresh_tokens")


class AppSetting(Base):
    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value_json: Mapped[Dict[str, Any]] = mapped_column(JSON)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
    )


def init_store() -> None:
    Base.metadata.create_all(bind=engine)
    with session_scope() as session:
        if not session.get(AppSetting, "demo_mode"):
            session.add(AppSetting(key="demo_mode", value_json={"enabled": True}))
        if not session.scalar(select(User.id).limit(1)):
            session.add(
                User(
                    id=new_id(),
                    email="admin@drishyaai.demo",
                    full_name="Drishya AI Admin",
                    password_hash=hash_password("Admin@12345"),
                    is_admin=True,
                    is_active=True,
                    is_verified=True,
                )
            )


def new_id() -> str:
    return secrets.token_hex(16)


@contextmanager
def session_scope() -> Generator[Session, None, None]:
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 390000)
    return base64.urlsafe_b64encode(salt + derived).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    raw = base64.urlsafe_b64decode(password_hash.encode("utf-8"))
    salt, expected = raw[:16], raw[16:]
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 390000)
    return hmac.compare_digest(derived, expected)


def _b64url_encode(payload: bytes) -> str:
    return base64.urlsafe_b64encode(payload).rstrip(b"=").decode("utf-8")


def _b64url_decode(payload: str) -> bytes:
    padding = "=" * (-len(payload) % 4)
    return base64.urlsafe_b64decode((payload + padding).encode("utf-8"))


def create_access_token(user: User) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": user.id,
        "email": user.email,
        "name": user.full_name,
        "role": "admin" if user.is_admin else "user",
        "type": "access",
        "exp": int((utc_now() + timedelta(minutes=ACCESS_TOKEN_TTL_MINUTES)).timestamp()),
    }
    signing_input = f"{_b64url_encode(json.dumps(header).encode('utf-8'))}.{_b64url_encode(json.dumps(payload).encode('utf-8'))}"
    signature = hmac.new(JWT_SECRET.encode("utf-8"), signing_input.encode("utf-8"), hashlib.sha256).digest()
    return f"{signing_input}.{_b64url_encode(signature)}"


def decode_access_token(token: str) -> Dict[str, Any]:
    header_b64, payload_b64, signature_b64 = token.split(".")
    signing_input = f"{header_b64}.{payload_b64}"
    expected = hmac.new(JWT_SECRET.encode("utf-8"), signing_input.encode("utf-8"), hashlib.sha256).digest()
    if not hmac.compare_digest(expected, _b64url_decode(signature_b64)):
        raise ValueError("Invalid token signature")
    payload = json.loads(_b64url_decode(payload_b64))
    if int(payload.get("exp", 0)) < int(datetime.now(timezone.utc).timestamp()):
        raise ValueError("Token expired")
    if payload.get("type") != "access":
        raise ValueError("Invalid token type")
    return payload


def _hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def issue_refresh_token(session: Session, user: User) -> str:
    token = secrets.token_urlsafe(48)
    session.add(
        RefreshToken(
            id=new_id(),
            user_id=user.id,
            token_hash=_hash_refresh_token(token),
            expires_at=utc_now() + timedelta(days=REFRESH_TOKEN_TTL_DAYS),
        )
    )
    return token


def revoke_refresh_token(session: Session, token: str) -> None:
    token_hash = _hash_refresh_token(token)
    record = session.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    if record and not record.revoked_at:
        record.revoked_at = utc_now()


def get_user_from_refresh_token(session: Session, token: str) -> Optional[User]:
    token_hash = _hash_refresh_token(token)
    record = session.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    if not record:
        return None
    if record.revoked_at is not None:
        return None
    if normalize_utc(record.expires_at) < utc_now():
        return None
    return session.get(User, record.user_id)


def get_demo_mode(session: Session) -> bool:
    setting = session.get(AppSetting, "demo_mode")
    return bool(setting and setting.value_json.get("enabled", True))


def set_demo_mode(session: Session, enabled: bool) -> bool:
    setting = session.get(AppSetting, "demo_mode")
    if not setting:
        setting = AppSetting(key="demo_mode", value_json={"enabled": enabled})
        session.add(setting)
    else:
        setting.value_json = {"enabled": enabled}
    return enabled


def serialize_user(user: User) -> Dict[str, Any]:
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "is_admin": user.is_admin,
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "must_change_password": user.must_change_password,
        "created_at": user.created_at.isoformat(),
        "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
    }


def build_cookie_settings(max_age: int) -> Dict[str, Any]:
    return {
        "httponly": True,
        "secure": COOKIE_SECURE,
        "samesite": "lax",
        "path": "/",
        "max_age": max_age,
    }


def load_location_presets() -> list[dict[str, Any]]:
    presets_path = Path(__file__).resolve().parents[1] / "shared" / "location-presets.json"
    return json.loads(presets_path.read_text(encoding="utf-8"))
