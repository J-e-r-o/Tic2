"""
Script para inicializar la base de datos y crear todas las tablas
Ejecuta esto una sola vez antes de testear la API
"""

from database import engine, Base
from config import settings
from models import User
from routes.auth import get_password_hash
import models
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_db():
    """Crea todas las tablas basadas en los modelos SQLAlchemy"""
    logger.info(f"Conectando a: {settings.DATABASE_URL}")
    
    try:
        # Crear todas las tablas
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Tablas creadas exitosamente!")
        
        # Crear usuarios por defecto
        create_default_users()
        
    except Exception as e:
        logger.error(f"❌ Error al crear tablas: {e}")
        raise

def create_default_users():
    """Crea usuarios por defecto si no existen"""
    from sqlalchemy.orm import sessionmaker
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Usuario admin
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            admin_user = User(
                username="admin",
                password_hash=get_password_hash("admin123"),
                role="admin"
            )
            db.add(admin_user)
            logger.info("✅ Usuario admin creado")
        
        # Usuario normal
        normal_user = db.query(User).filter(User.username == "user").first()
        if not normal_user:
            normal_user = User(
                username="user",
                password_hash=get_password_hash("user123"),
                role="user"
            )
            db.add(normal_user)
            logger.info("✅ Usuario user creado")
        
        db.commit()
        logger.info("✅ Usuarios por defecto creados exitosamente!")
        
    except Exception as e:
        logger.error(f"❌ Error al crear usuarios por defecto: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
