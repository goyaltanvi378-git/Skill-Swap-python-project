from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class SkillBase(BaseModel):
    skill_name: str
    type: str # "offered" or "wanted"

class SkillCreate(SkillBase):
    pass

class SkillResponse(SkillBase):
    id: int
    user_id: int

    class Config:
        orm_mode = True
        from_attributes = True

class UserBase(BaseModel):
    name: str
    email: str
    college: Optional[str] = None
    branch: Optional[str] = None
    year: Optional[str] = None
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    availability: Optional[str] = "Weekends & Evenings"

class UserRegister(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserUpdate(BaseModel):
    name: str
    college: Optional[str] = None
    branch: Optional[str] = None
    year: Optional[str] = None
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    availability: Optional[str] = "Weekends & Evenings"

class UserResponse(UserBase):
    id: int
    rating: float
    exchanges_count: int
    skills: List[SkillResponse] = []

    class Config:
        orm_mode = True
        from_attributes = True

class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

    class Config:
        orm_mode = True
        from_attributes = True

class MatchStudentResponse(BaseModel):
    id: int
    name: str
    college: Optional[str] = None
    branch: Optional[str] = None
    year: Optional[str] = None
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    availability: Optional[str] = None
    rating: float
    exchanges_count: int
    skills_offered: List[str]
    skills_wanted: List[str]
    match_score: int
    status: str # "pending", "connected", etc.

    class Config:
        orm_mode = True
        from_attributes = True

class MessageCreate(BaseModel):
    receiver_id: int
    message_text: str

class MessageResponse(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    message_text: str
    timestamp: datetime

    class Config:
        orm_mode = True
        from_attributes = True
