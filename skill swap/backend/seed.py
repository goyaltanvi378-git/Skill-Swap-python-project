from sqlalchemy.orm import Session
from backend.models import User, Skill, Match, Message
from backend.auth import hash_password
from datetime import datetime, timedelta

def seed_data(db: Session):
    # Check if we already have users
    if db.query(User).first() is not None:
        print("Database already seeded.")
        return

    print("Seeding database...")

    # Create users
    users_data = [
        {
            "name": "Aditya Kumar",
            "email": "aditya@college.edu",
            "password": "password123",
            "college": "DTU Delhi",
            "branch": "Computer Engineering",
            "year": "3rd Year",
            "bio": "Enthusiastic developer building web applications and exploring system design. Always eager to exchange coding tips and learn new frameworks!",
            "profile_image": "https://api.dicebear.com/7.x/adventurer/svg?seed=Aditya",
            "availability": "Weekends & Evenings",
            "rating": 4.8,
            "exchanges_count": 4,
            "skills": [
                {"skill_name": "Python", "type": "offered"},
                {"skill_name": "Java", "type": "offered"},
                {"skill_name": "Data Structures", "type": "offered"},
                {"skill_name": "Git & GitHub", "type": "offered"},
                {"skill_name": "AWS", "type": "wanted"},
                {"skill_name": "Docker", "type": "wanted"},
                {"skill_name": "Machine Learning", "type": "wanted"}
            ]
        },
        {
            "name": "Rahul Sharma",
            "email": "rahul@iiitd.ac.in",
            "password": "password123",
            "college": "IIIT Delhi",
            "branch": "Computer Science",
            "year": "3rd Year",
            "bio": "Passionate about cloud & devops. Love teaching and learning new things together. Hit me up if you want to deploy apps!",
            "profile_image": "https://api.dicebear.com/7.x/adventurer/svg?seed=Rahul",
            "availability": "Weekends & Evenings",
            "rating": 4.8,
            "exchanges_count": 12,
            "skills": [
                {"skill_name": "AWS", "type": "offered"},
                {"skill_name": "Cloud Computing", "type": "offered"},
                {"skill_name": "Linux", "type": "offered"},
                {"skill_name": "DevOps", "type": "offered"},
                {"skill_name": "Python", "type": "wanted"},
                {"skill_name": "Data Structures", "type": "wanted"},
                {"skill_name": "System Design", "type": "wanted"}
            ]
        },
        {
            "name": "Priya Verma",
            "email": "priya@nitt.edu",
            "password": "password123",
            "college": "NIT Trichy",
            "branch": "Information Technology",
            "year": "2nd Year",
            "bio": "Frontend designer & developer. Looking to learn cloud technologies and backend frameworks like Django/FastAPI.",
            "profile_image": "https://api.dicebear.com/7.x/adventurer/svg?seed=Priya",
            "availability": "Weekdays (6 PM - 9 PM)",
            "rating": 4.7,
            "exchanges_count": 8,
            "skills": [
                {"skill_name": "Java", "type": "offered"},
                {"skill_name": "AWS", "type": "offered"},
                {"skill_name": "HTML & CSS", "type": "offered"},
                {"skill_name": "Python", "type": "wanted"},
                {"skill_name": "Django", "type": "wanted"},
                {"skill_name": "Docker", "type": "wanted"}
            ]
        },
        {
            "name": "Karan Mehta",
            "email": "karan@vit.edu",
            "password": "password123",
            "college": "VIT Pune",
            "branch": "Computer Engineering",
            "year": "4th Year",
            "bio": "Machine learning enthusiast looking to brush up on Python and web frameworks.",
            "profile_image": "https://api.dicebear.com/7.x/adventurer/svg?seed=Karan",
            "availability": "Flexible Hours",
            "rating": 4.6,
            "exchanges_count": 6,
            "skills": [
                {"skill_name": "Machine Learning", "type": "offered"},
                {"skill_name": "Python", "type": "offered"},
                {"skill_name": "SQL", "type": "offered"},
                {"skill_name": "Java", "type": "wanted"},
                {"skill_name": "React", "type": "wanted"},
                {"skill_name": "AWS", "type": "wanted"}
            ]
        },
        {
            "name": "Sneha Joshi",
            "email": "sneha@vit.edu",
            "password": "password123",
            "college": "VIT Pune",
            "branch": "Software Engineering",
            "year": "3rd Year",
            "bio": "Frontend web developer. Looking to explore backend technologies and containerization.",
            "profile_image": "https://api.dicebear.com/7.x/adventurer/svg?seed=Sneha",
            "availability": "Weekends",
            "rating": 4.9,
            "exchanges_count": 15,
            "skills": [
                {"skill_name": "React", "type": "offered"},
                {"skill_name": "Node.js", "type": "offered"},
                {"skill_name": "UI/UX Design", "type": "offered"},
                {"skill_name": "Python", "type": "wanted"},
                {"skill_name": "Java", "type": "wanted"},
                {"skill_name": "Docker", "type": "wanted"}
            ]
        },
        {
            "name": "Aniket Singh",
            "email": "aniket@mnit.ac.in",
            "password": "password123",
            "college": "MNIT Jaipur",
            "branch": "Electrical Engineering",
            "year": "3rd Year",
            "bio": "DSA nerd. Happy to explain algorithms and complexity analyses in exchange for React or Docker help.",
            "profile_image": "https://api.dicebear.com/7.x/adventurer/svg?seed=Aniket",
            "availability": "Everyday (8 PM - 10 PM)",
            "rating": 4.6,
            "exchanges_count": 9,
            "skills": [
                {"skill_name": "DSA", "type": "offered"},
                {"skill_name": "System Design", "type": "offered"},
                {"skill_name": "C++", "type": "offered"},
                {"skill_name": "React", "type": "wanted"},
                {"skill_name": "Docker", "type": "wanted"},
                {"skill_name": "Python", "type": "wanted"}
            ]
        }
    ]

    created_users = []
    for ud in users_data:
        user = User(
            name=ud["name"],
            email=ud["email"],
            password_hash=hash_password(ud["password"]),
            college=ud["college"],
            branch=ud["branch"],
            year=ud["year"],
            bio=ud["bio"],
            profile_image=ud["profile_image"],
            availability=ud["availability"],
            rating=ud["rating"],
            exchanges_count=ud["exchanges_count"]
        )
        db.add(user)
        db.flush()  # gets the ID

        for sd in ud["skills"]:
            skill = Skill(
                user_id=user.id,
                skill_name=sd["skill_name"],
                type=sd["type"]
            )
            db.add(skill)
        
        created_users.append(user)

    db.commit()

    # Re-retrieve for matching relations
    aditya = created_users[0]
    rahul = created_users[1]
    priya = created_users[2]
    karan = created_users[3]
    sneha = created_users[4]
    aniket = created_users[5]

    # Pre-establish connection statuses to make dashboard active
    # Aditya & Rahul are already connected (status: connected)
    # Aditya & Priya are connected (status: connected)
    # Aditya & Karan has pending request from Karan (status: pending)
    # Aditya & Sneha is none
    
    matches_to_seed = [
        Match(user1_id=aditya.id, user2_id=rahul.id, match_score=92, status="connected"),
        Match(user1_id=aditya.id, user2_id=priya.id, match_score=87, status="connected"),
        Match(user1_id=aditya.id, user2_id=karan.id, match_score=84, status="pending"),
        Match(user1_id=aditya.id, user2_id=aniket.id, match_score=83, status="none")
    ]
    db.add_all(matches_to_seed)

    # Let's seed some mock messages between Aditya and Rahul
    messages = [
        Message(
            sender_id=rahul.id,
            receiver_id=aditya.id,
            message_text="Hey Aditya! I saw you offer Python and want AWS. I can definitely teach you AWS in exchange for Python help.",
            timestamp=datetime.utcnow() - timedelta(hours=2)
        ),
        Message(
            sender_id=aditya.id,
            receiver_id=rahul.id,
            message_text="Hey Rahul! That sounds perfect. I am currently learning Python for a web app and need AWS to deploy. Let's exchange!",
            timestamp=datetime.utcnow() - timedelta(hours=1, minutes=45)
        ),
        Message(
            sender_id=rahul.id,
            receiver_id=aditya.id,
            message_text="Awesome. How about we connect over a Zoom call this weekend? I can show you how to configure ECS and EC2.",
            timestamp=datetime.utcnow() - timedelta(hours=1)
        )
    ]
    db.add_all(messages)
    
    # Also seed a message from Priya to Aditya
    messages_priya = [
        Message(
            sender_id=priya.id,
            receiver_id=aditya.id,
            message_text="Hi Aditya, would love to learn Java basics from you. Let me know when you're free!",
            timestamp=datetime.utcnow() - timedelta(minutes=15)
        )
    ]
    db.add_all(messages_priya)

    db.commit()
    print("Database seeding completed.")
