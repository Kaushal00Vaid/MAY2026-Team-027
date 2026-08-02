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

    # Health check
    @app.get("/", tags=["Health"])
    def root():
        return {"status": "success", "message": "SocietySync API is running."}

    @app.get("/health", tags=["Health"])
    def health():
        return {"status": "healthy"}

    return app


app = create_app()
