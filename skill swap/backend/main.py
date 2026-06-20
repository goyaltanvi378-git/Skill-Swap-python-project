import os
from fastapi import FastAPI, Depends, HTTPException, status, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Dict, Any

# Resolve paths relative to project root (parent of backend/)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Ensure relative imports work
from backend.database import engine, Base, get_db, SessionLocal
from backend.models import User, Skill, Match, Message
from backend.schemas import (
    UserRegister, UserLogin, UserResponse, UserUpdate,
    SkillCreate, SkillResponse, MatchStudentResponse,
    MessageCreate, MessageResponse, AuthResponse
)
from backend.auth import (
    hash_password, verify_password, create_access_token, get_current_user
)
from backend.matching import get_matches_for_user
from backend.seed import seed_data

# Initialize DB tables
Base.metadata.create_all(bind=engine)

# Seed database on startup
db_session = SessionLocal()
try:
    seed_data(db_session)
finally:
    db_session.close()

app = FastAPI(title="SkillSwap API", version="1.0.0")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Endpoints

@app.post("/api/register", response_model=AuthResponse)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )

    # Hash the password and create user
    hashed = hash_password(user_in.password)
    db_user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=hashed,
        college=user_in.college,
        branch=user_in.branch,
        year=user_in.year,
        bio=user_in.bio,
        profile_image=user_in.profile_image or f"https://api.dicebear.com/7.x/adventurer/svg?seed={user_in.name}",
        availability=user_in.availability or "Weekends & Evenings"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Generate token
    access_token = create_access_token(data={"sub": db_user.email})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": db_user
    }

@app.post("/api/login", response_model=AuthResponse)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_in.email).first()
    if not user or not verify_password(login_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    access_token = create_access_token(data={"sub": user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@app.post("/api/logout")
def logout():
    return {"message": "Logged out successfully"}

@app.get("/api/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@app.put("/api/profile", response_model=UserResponse)
def update_profile(profile_in: UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.name = profile_in.name
    current_user.college = profile_in.college
    current_user.branch = profile_in.branch
    current_user.year = profile_in.year
    current_user.bio = profile_in.bio
    if profile_in.profile_image:
        current_user.profile_image = profile_in.profile_image
    current_user.availability = profile_in.availability or "Weekends & Evenings"
    
    db.commit()
    db.refresh(current_user)
    return current_user

@app.post("/api/skills", response_model=SkillResponse)
def add_skill(skill_in: SkillCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check if skill already exists for the user with the same name and type
    existing_skill = db.query(Skill).filter(
        Skill.user_id == current_user.id,
        Skill.skill_name == skill_in.skill_name,
        Skill.type == skill_in.type
    ).first()
    
    if existing_skill:
        return existing_skill

    db_skill = Skill(
        user_id=current_user.id,
        skill_name=skill_in.skill_name,
        type=skill_in.type
    )
    db.add(db_skill)
    db.commit()
    db.refresh(db_skill)
    return db_skill

@app.delete("/api/skills/{skill_id}")
def delete_skill(skill_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    skill = db.query(Skill).filter(Skill.id == skill_id, Skill.user_id == current_user.id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found or unauthorized.")
    
    db.delete(skill)
    db.commit()
    return {"message": "Skill deleted successfully"}

@app.get("/api/matches", response_model=List[MatchStudentResponse])
def get_matches(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    matches = get_matches_for_user(current_user, db)
    return matches

@app.get("/api/profile/{user_id}", response_model=UserResponse)
def get_profile(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user

@app.post("/api/connect")
def connect_user(payload: Dict[str, int] = Body(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    target_id = payload.get("user_id")
    if not target_id:
        raise HTTPException(status_code=400, detail="Missing user_id parameter")

    if target_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot connect with yourself")

    # Check if target exists
    target = db.query(User).filter(User.id == target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target user not found")

    # Check existing match
    existing_match = db.query(Match).filter(
        ((Match.user1_id == current_user.id) & (Match.user2_id == target_id)) |
        ((Match.user1_id == target_id) & (Match.user2_id == current_user.id))
    ).first()

    if existing_match:
        if existing_match.status == "none":
            existing_match.status = "pending"
            db.commit()
            return {"status": "pending", "message": "Connection request sent!"}
        elif existing_match.status == "pending" and existing_match.user2_id == current_user.id:
            # The other person sent, we approve. It becomes connected!
            existing_match.status = "connected"
            # Increment exchange counts as they have matched!
            current_user.exchanges_count += 1
            target.exchanges_count += 1
            db.commit()
            return {"status": "connected", "message": "Connection approved! You can now chat."}
        else:
            return {"status": existing_match.status, "message": f"Connection is {existing_match.status}."}

    # Create new connection (pending)
    new_match = Match(
        user1_id=current_user.id,
        user2_id=target_id,
        match_score=80, # Base match score
        status="pending"
    )
    db.add(new_match)
    db.commit()
    return {"status": "pending", "message": "Connection request sent!"}

@app.get("/api/messages/{user_id}", response_model=List[MessageResponse])
def get_messages(user_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    messages = db.query(Message).filter(
        ((Message.sender_id == current_user.id) & (Message.receiver_id == user_id)) |
        ((Message.sender_id == user_id) & (Message.receiver_id == current_user.id))
    ).order_by(Message.timestamp.asc()).all()
    return messages

@app.post("/api/messages", response_model=MessageResponse)
def send_message(msg_in: MessageCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check if target exists
    target = db.query(User).filter(User.id == msg_in.receiver_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Receiver not found")

    # Create message
    db_msg = Message(
        sender_id=current_user.id,
        receiver_id=msg_in.receiver_id,
        message_text=msg_in.message_text
    )
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    return db_msg

# Serve Frontend Static files and UI

# Create paths if they do not exist
os.makedirs(os.path.join(BASE_DIR, "frontend/static/css"), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, "frontend/static/js"), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, "frontend/templates"), exist_ok=True)

# Mount the static files directory
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "frontend/static")), name="static")

_INDEX_HTML = os.path.join(BASE_DIR, "frontend/templates/index.html")

# Serve the Index (SPA) page
@app.get("/")
def serve_spa():
    return FileResponse(_INDEX_HTML)

# Catch-all to serve index.html for page refreshes in SPA (though using hashtag routing)
@app.get("/{path_name:path}")
def serve_spa_catchall(path_name: str):
    if path_name.startswith("api/") or path_name.startswith("static/"):
        raise HTTPException(status_code=404, detail="Not Found")
    return FileResponse(_INDEX_HTML)

