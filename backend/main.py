from fastapi import FastAPI

# Initialize the FastAPI app
app = FastAPI(
    title="Backend API",
    description="Minimal FastAPI setup to verify the development server.",
    version="0.1.0"
)

# Root endpoint
@app.get("/")
def read_root():
    return {"status": "success", "message": "FastAPI development server is running!"}

# A simple health check endpoint
@app.get("/health")
def health_check():
    return {"status": "healthy"}