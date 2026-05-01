from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User
from pydantic import BaseModel
from datetime import datetime
import logging
import hashlib

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["authentication"])

# Configuración de hashing de contraseñas (usando sha256 para desarrollo)
def get_password_hash(password):
    """Genera hash de la contraseña usando SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password, hashed_password):
    """Verifica si la contraseña coincide con el hash"""
    return get_password_hash(plain_password) == hashed_password

# Modelos Pydantic
class UserCreate(BaseModel):
    username: str
    password: str
    role: str  # 'admin' o 'user'

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    created_at: str

    class Config:
        from_attributes = True

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str

def authenticate_user(db: Session, username: str, password: str):
    """Autentica usuario y devuelve el objeto User si es válido"""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return False
    if not verify_password(password, user.password_hash):
        return False
    return user

@router.post("/register", response_model=UserResponse)
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    """
    Registra un nuevo usuario en el sistema

    Parameters:
    - username: Nombre de usuario único
    - password: Contraseña
    - role: Rol del usuario ('admin' o 'user')
    """
    # Validar rol
    if user.role not in ["admin", "user"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El rol debe ser 'admin' o 'user'"
        )

    # Verificar si el usuario ya existe
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre de usuario ya está registrado"
        )

    # Crear nuevo usuario
    hashed_password = get_password_hash(user.password)
    new_user = User(
        username=user.username,
        password_hash=hashed_password,
        role=user.role
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    logger.info(f"Usuario registrado: {new_user.username} - {new_user.role}")

    return UserResponse(
        id=new_user.id,
        username=new_user.username,
        role=new_user.role,
        created_at=new_user.created_at.isoformat()
    )

@router.post("/login", response_model=LoginResponse)
async def login_user(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Inicia sesión y devuelve un token de acceso

    Parameters:
    - username: Nombre de usuario
    - password: Contraseña
    """
    user = authenticate_user(db, user_credentials.username, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Actualizar último login
    user.last_login = datetime.utcnow()
    db.commit()

    logger.info(f"Usuario autenticado: {user.username}")

    # Para este ejemplo, usamos un token simple (en producción usar JWT)
    access_token = f"token-{user.id}-{user.username}-{user.role}"

    return LoginResponse(
        access_token=access_token,
        role=user.role,
        username=user.username
    )

@router.get("/me", response_model=UserResponse)
async def get_current_user(username: str, db: Session = Depends(get_db)):
    """
    Obtiene información del usuario actual

    Parameters:
    - username: Nombre de usuario (debería venir del token en producción)
    """
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )

    return UserResponse(
        id=user.id,
        username=user.username,
        role=user.role,
        created_at=user.created_at.isoformat()
    )

@router.get("/users", response_model=list[UserResponse])
async def list_users(db: Session = Depends(get_db)):
    """
    Lista todos los usuarios (solo para admin)

    En producción, agregar verificación de permisos
    """
    users = db.query(User).all()
    return [
        UserResponse(
            id=user.id,
            username=user.username,
            role=user.role,
            created_at=user.created_at.isoformat()
        )
        for user in users
    ]