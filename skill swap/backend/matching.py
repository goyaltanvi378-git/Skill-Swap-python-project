from sqlalchemy.orm import Session
from backend.models import User, Skill, Match
from typing import List, Dict, Any

def get_matches_for_user(user: User, db: Session) -> List[Dict[str, Any]]:
    # Get current user's offered and wanted skills
    offered_skills = {s.skill_name.strip().lower() for s in user.skills if s.type == "offered"}
    wanted_skills = {s.skill_name.strip().lower() for s in user.skills if s.type == "wanted"}

    if not offered_skills and not wanted_skills:
        return []

    # Get all other users from the DB
    other_users = db.query(User).filter(User.id != user.id).all()
    matches = []

    for other in other_users:
        other_offered = {s.skill_name.strip().lower() for s in other.skills if s.type == "offered"}
        other_wanted = {s.skill_name.strip().lower() for s in other.skills if s.type == "wanted"}

        # Calculate intersections
        # What current user can teach other
        can_teach = offered_skills.intersection(other_wanted)
        # What current user can learn from other
        can_learn = wanted_skills.intersection(other_offered)

        score = 0
        if can_teach and can_learn:
            # Mutual Match! Best compatibility (80% - 98%)
            score = 80 + 5 * (len(can_teach) + len(can_learn) - 2)
            score = min(score, 98)
        elif can_teach or can_learn:
            # One-way match (40% - 60%)
            score = 40 + 5 * (len(can_teach) + len(can_learn) - 1)
            score = min(score, 60)

        # Show matches that have at least some match score
        # Specifically, we prioritize mutual matches (score >= 80) but can show all >= 40
        if score >= 40:
            # Check connection status in the Match table
            match_record = db.query(Match).filter(
                ((Match.user1_id == user.id) & (Match.user2_id == other.id)) |
                ((Match.user1_id == other.id) & (Match.user2_id == user.id))
            ).first()

            status = "none"
            if match_record:
                status = match_record.status

            # Get display skills
            skills_offered = [s.skill_name for s in other.skills if s.type == "offered"]
            skills_wanted = [s.skill_name for s in other.skills if s.type == "wanted"]

            matches.append({
                "id": other.id,
                "name": other.name,
                "college": other.college,
                "branch": other.branch,
                "year": other.year,
                "bio": other.bio,
                "profile_image": other.profile_image,
                "availability": other.availability,
                "rating": other.rating,
                "exchanges_count": other.exchanges_count,
                "skills_offered": skills_offered,
                "skills_wanted": skills_wanted,
                "match_score": score,
                "status": status
            })

    # Sort matches by score (highest first)
    matches.sort(key=lambda x: x["match_score"], reverse=True)
    return matches
