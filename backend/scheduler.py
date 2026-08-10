import time
import logging
from datetime import datetime, timezone
from apscheduler.schedulers.blocking import BlockingScheduler
from sqlalchemy import text
from sqlalchemy.orm import Session

# Import models and DB session
from app.db.database import SessionLocal
from app.finance.models import Invoice
from app.security.models import Visitor, GuestPass
from app.amenities.models import AmenityBooking
from app.community.models import Notice, NoticeDelivery
from app.db.models.user import User

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("Scheduler")

# Hardcoded late fee for demonstration (e.g. 500 INR = 50000 paise)
LATE_FEE_PAISE = 50000

def fanout_notices():
    """
    Finds active notices and ensures a NoticeDelivery record exists 
    for every active user. Uses ON CONFLICT DO NOTHING for idempotency.
    """
    logger.info("Running job: fanout_notices")
    db: Session = SessionLocal()
    try:
        # Get active notices
        active_notices = db.query(Notice).filter(Notice.is_active == True).all()
        if not active_notices:
            return

        # Get all active users
        active_users = db.query(User).filter(User.is_active == True).all()
        user_ids = [u.user_id for u in active_users]

        if not user_ids:
            return

        new_deliveries = 0
        # Use raw SQL for the ON CONFLICT DO NOTHING insertion to be efficient and idempotent
        sql = text("""
            INSERT INTO community_notice_deliveries (notice_id, user_id, delivered_at)
            VALUES (:notice_id, :user_id, :delivered_at)
            ON CONFLICT (notice_id, user_id) DO NOTHING
        """)
        
        now = datetime.now(timezone.utc)
        for notice in active_notices:
            for uid in user_ids:
                # Basic fan-out (could be filtered by block/flat in future)
                result = db.execute(sql, {
                    "notice_id": notice.id,
                    "user_id": uid,
                    "delivered_at": now
                })
                new_deliveries += result.rowcount
                
        db.commit()
        logger.info(f"fanout_notices completed. Inserted {new_deliveries} new deliveries.")
    except Exception as e:
        db.rollback()
        logger.error(f"Error in fanout_notices: {e}")
    finally:
        db.close()


def update_overdue_invoices():
    """
    Updates invoices past their due date from 'issued' to 'overdue'
    and applies a late fee. Highly idempotent because it only targets 'issued' status.
    """
    logger.info("Running job: update_overdue_invoices")
    db: Session = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        today = now.date()
        
        # Only update if status is 'issued' and due_date < today
        overdue_invoices = db.query(Invoice).filter(
            Invoice.status == 'issued',
            Invoice.due_date < today
        ).all()
        
        count = 0
        for inv in overdue_invoices:
            inv.status = 'overdue'
            inv.late_fee_paise = LATE_FEE_PAISE
            count += 1
            
        if count > 0:
            db.commit()
            
        logger.info(f"update_overdue_invoices completed. Updated {count} invoices.")
    except Exception as e:
        db.rollback()
        logger.error(f"Error in update_overdue_invoices: {e}")
    finally:
        db.close()


def expire_visitors_and_passes():
    """
    Marks visitors as expired if their expires_at has passed and they are still pending.
    Revokes guest passes if their valid_until has passed.
    """
    logger.info("Running job: expire_visitors_and_passes")
    db: Session = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        
        # Expire Visitors
        expired_visitors = db.query(Visitor).filter(
            Visitor.status == 'pending',
            Visitor.expires_at < now
        ).all()
        
        v_count = 0
        for v in expired_visitors:
            v.status = 'expired'
            v_count += 1
            
        # Expire Guest Passes
        expired_passes = db.query(GuestPass).filter(
            GuestPass.valid_until < now,
            GuestPass.revoked_at.is_(None)
        ).all()
        
        p_count = 0
        for p in expired_passes:
            p.revoked_at = now
            p_count += 1
            
        if v_count > 0 or p_count > 0:
            db.commit()
            
        logger.info(f"expire_visitors_and_passes completed. Expired {v_count} visitors, revoked {p_count} passes.")
    except Exception as e:
        db.rollback()
        logger.error(f"Error in expire_visitors_and_passes: {e}")
    finally:
        db.close()


def complete_amenity_bookings():
    """
    Marks confirmed amenity bookings as completed once their end time has passed.
    """
    logger.info("Running job: complete_amenity_bookings")
    db: Session = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        
        completed_bookings = db.query(AmenityBooking).filter(
            AmenityBooking.status == 'confirmed',
            AmenityBooking.ends_at < now
        ).all()
        
        count = 0
        for b in completed_bookings:
            b.status = 'completed'
            count += 1
            
        if count > 0:
            db.commit()
            
        logger.info(f"complete_amenity_bookings completed. Marked {count} bookings as completed.")
    except Exception as e:
        db.rollback()
        logger.error(f"Error in complete_amenity_bookings: {e}")
    finally:
        db.close()


if __name__ == '__main__':
    logger.info("Starting APScheduler...")
    scheduler = BlockingScheduler()
    
    # Schedule jobs
    # Running frequently for demonstration/testing. In production, some of these might run daily.
    scheduler.add_job(fanout_notices, 'interval', minutes=1, id='fanout_notices', replace_existing=True)
    scheduler.add_job(update_overdue_invoices, 'interval', minutes=5, id='update_overdue_invoices', replace_existing=True)
    scheduler.add_job(expire_visitors_and_passes, 'interval', minutes=1, id='expire_visitors_and_passes', replace_existing=True)
    scheduler.add_job(complete_amenity_bookings, 'interval', minutes=1, id='complete_amenity_bookings', replace_existing=True)
    
    # Run once immediately on startup to catch up
    logger.info("Running initial batch of jobs...")
    fanout_notices()
    update_overdue_invoices()
    expire_visitors_and_passes()
    complete_amenity_bookings()
    
    try:
        logger.info("Scheduler is active and waiting for next interval.")
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Scheduler shutting down...")
