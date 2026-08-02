from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.dependencies import get_current_user
from app.db.models.user import User
from app.helpdesk.schemas import ComplaintCreate, ComplaintUpdate, ComplaintResponse, CommentCreate, CommentResponse
from app.helpdesk.service import create_complaint, get_complaints, get_complaint, update_complaint, add_comment, get_comments

router = APIRouter()

@router.post("/complaints", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
def create_new_complaint(
    complaint_in: ComplaintCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return create_complaint(db=db, user_id=current_user.user_id, complaint_in=complaint_in)

@router.get("/complaints", response_model=List[ComplaintResponse])
def read_complaints(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_complaints(db=db)

@router.get("/complaints/{complaint_id}", response_model=ComplaintResponse)
def read_complaint(
    complaint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_complaint(db=db, complaint_id=complaint_id)

@router.patch("/complaints/{complaint_id}", response_model=ComplaintResponse)
def update_existing_complaint(
    complaint_id: int,
    complaint_in: ComplaintUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return update_complaint(db=db, complaint_id=complaint_id, complaint_in=complaint_in)


@router.post("/complaints/{complaint_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def add_complaint_comment(
    complaint_id: int,
    comment_in: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    comment = add_comment(db=db, complaint_id=complaint_id, user_id=current_user.user_id, comment_in=comment_in)
    return CommentResponse(
        id=comment.id,
        complaint_id=comment.complaint_id,
        user_id=comment.user_id,
        body=comment.body,
        created_at=comment.created_at,
        author_name=f"{comment.author.first_name} {comment.author.last_name}",
    )


@router.get("/complaints/{complaint_id}/comments", response_model=List[CommentResponse])
def get_complaint_comments(
    complaint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    comments = get_comments(db=db, complaint_id=complaint_id)
    return [
        CommentResponse(
            id=c.id,
            complaint_id=c.complaint_id,
            user_id=c.user_id,
            body=c.body,
            created_at=c.created_at,
            author_name=f"{c.author.first_name} {c.author.last_name}",
        )
        for c in comments
    ]
