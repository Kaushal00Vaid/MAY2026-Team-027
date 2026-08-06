"""
app/main.py — FastAPI application factory.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.auth.router import router as auth_router
from app.config import settings
from app.core.security import limiter
from app.users.router import router as users_router
from app.helpdesk.router import router as helpdesk_router
from app.helpdesk.complaints.router import router as complaints_router
from app.helpdesk.work_orders.router import router as helpdesk_operations_router
from app.finance.router import router as finance_router
from app.security.router import router as security_router

def create_app() -> FastAPI:
    app = FastAPI(
        title="SocietySync API",
        description="Backend API for SocietySync — Society Management Platform",
        version="1.0.0",
        docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
        redoc_url="/redoc" if settings.ENVIRONMENT == "development" else None,
    )

    # Rate limiter
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.FRONTEND_URL],
        allow_credentials=True,  # Required for HttpOnly cookie exchange
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
    app.include_router(users_router, prefix="/users", tags=["Users"])
    app.include_router(helpdesk_router, prefix="/api/helpdesk", tags=["Helpdesk"])
    app.include_router(
        complaints_router,
        prefix="/api/v1/complaints",
        tags=["Helpdesk - Complaints"],
    )
    app.include_router(
        helpdesk_operations_router,
        prefix="/api/v1/helpdesk",
        tags=["Helpdesk - Operations"],
    )
    app.include_router(finance_router, prefix="/api/finance", tags=["Finance"])
    app.include_router(security_router, prefix="/api/v1/security", tags=["Security & Access"])

    # Health check
    @app.get("/", tags=["Health"])
    def root():
        return {"status": "success", "message": "SocietySync API is running."}

    @app.get("/health", tags=["Health"])
    def health():
        return {"status": "healthy"}

    return app


app = create_app()
