from pydantic import BaseModel
from typing import Optional

class CommentCreate(BaseModel):
    user_id: Optional[int] = None
    user_name: str = "Anonymous"
    user_email: Optional[str] = None
    content: str
    rating: Optional[float] = None  # 1-10

class RatingCreate(BaseModel):
    user_id: str = "anonymous"
    rating: float  # 1-10

class SignupCreate(BaseModel):
    name: str
    email: str
    password: str

class LoginCreate(BaseModel):
    email: str
    password: str

class GoogleAuthCreate(BaseModel):
    credential: str

class FacebookAuthCreate(BaseModel):
    access_token: str

class SettingsUpdate(BaseModel):
    darkMode: Optional[bool] = None
    autoplay: Optional[bool] = None
    notifications: Optional[bool] = None
    emailDigest: Optional[bool] = None
    language: Optional[str] = None
    quality: Optional[str] = None

class ProfileUpdate(BaseModel):
    name: str

class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str
