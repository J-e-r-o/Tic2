from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from database import engine, Base, SessionLocal
import models
import logging
from sqlalchemy import text

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)

logger = logging.getLogger(__name__)
logger.info("Iniciando TIC2 API...")

# NOTA: en Lambda no se recomienda crear tablas en cada cold start.
#       Ejecuta la creación o migración de la base de datos de forma manual
#       o con un script separado antes de desplegar.

# Inicializar aplicación
app = FastAPI(
    title="TIC2 API",
    description="API para detección de plazas de estacionamiento con AWS",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar origins concretos
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Importar routers
from routes.detect import router as detect_router
from routes.rois import router as rois_router
from routes.simulate import router as simulate_router
from routes.auth import router as auth_router
logger.info("Rutas importadas correctamente")

# Incluir routers
app.include_router(detect_router)
app.include_router(rois_router)
app.include_router(simulate_router)
app.include_router(auth_router)

@app.get("/health")
def health_check():
    """
    Health check endpoint para AWS ELB/Load Balancer
    """
    return {
        "status": "ok", 
        "service": "TIC2 API",
        "version": "1.0.0"
    }

@app.get("/")
def root():
    """
    Root endpoint con información de la API
    """
    return {
        "message": "TIC2 API - Sistema de Detección de Plazas",
        "version": "1.0.0",
        "endpoints": {
            "Detección": "/api/detect",
            "ROIs": "/api/rois",
            "Simulación": "/api/simulate",
            "Documentación": "/docs",
            "Health": "/health"
        },
        "example_rois": {
            "POST /api/rois/create": {
                "name": "Plaza 1",
                "description": "normal",
                "coordinates": [[100, 100], [200, 100], [200, 200], [100, 200]]
            },
            "POST /api/detect/upload-and-detect": "Sube una imagen y detecta plazas ocupadas/libres"
        }
    }

@app.get("/api/status")
def api_status():
    """
    Status completo de la API (DB, S3, etc)
    """
    try:
        # Verificar DB
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        db_status = "ok"
    except Exception as e:
        db_status = f"error: {str(e)}"
        logger.error(f"Database connection error: {str(e)}")
    
    return {
        "service": "TIC2 API",
        "database": db_status,
        "s3_bucket": settings.S3_BUCKET or "not_configured",
        "environment": "production" if not settings.DEBUG else "development"
    }

if __name__ == "__main__":
    import uvicorn
    
    logger.info(f"Iniciando servidor en {settings.API_HOST}:{settings.API_PORT}")
    
    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG,
        log_level="info"
    )

# Lambda handler para AWS Lambda usando Mangum
from mangum import Mangum
handler = Mangum(app)
