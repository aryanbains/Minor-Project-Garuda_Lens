from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=255)


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)


class PasswordResetRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)


class CompletePasswordResetRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    reset_code: str = Field(..., min_length=6, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)


class CoordinateInput(BaseModel):
    lat: float
    lon: float


class AnalysisRunRequest(BaseModel):
    location_name: str = Field(..., min_length=2, max_length=255)
    preset_id: Optional[str] = None
    coordinates: Optional[CoordinateInput] = None
    zoom_level: str = Field(default="City-Wide (0.025°)")
    resolution: str = Field(default="Standard (5m)")
    mode: str = Field(default="rgb")
    before_date: Optional[str] = None
    after_date: Optional[str] = None
    timeline_years: int = Field(default=5, ge=3, le=8)


class DemoModeRequest(BaseModel):
    enabled: bool


class AdminUserUpdateRequest(BaseModel):
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=255)


class AdminPasswordResetRequest(BaseModel):
    new_password: Optional[str] = Field(default=None, min_length=8, max_length=128)


class AuthEnvelope(BaseModel):
    user: Dict[str, Any]
    message: str


class SessionEnvelope(BaseModel):
    user: Optional[Dict[str, Any]] = None
    message: str


class AnalysisEnvelope(BaseModel):
    analysis_id: str
    result: Dict[str, Any]


class HistoryEnvelope(BaseModel):
    analyses: List[Dict[str, Any]]
