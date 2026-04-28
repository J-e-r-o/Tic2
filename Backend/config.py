import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from pydantic import ConfigDict

load_dotenv()

class Settings(BaseSettings):
    model_config = ConfigDict(
        extra='ignore',
        env_file='.env',
        case_sensitive=False
    )
    
    # AWS
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    S3_BUCKET: str
    
    # Database
    DB_HOST: str
    DB_PORT: int = 5432
    DB_USER: str
    DB_PASSWORD: str
    DB_NAME: str
    
    # API
    API_PORT: int = 8000
    API_HOST: str = "0.0.0.0"
    DEBUG: bool = False
    
    @property
    def DATABASE_URL(self) -> str:
        """Construye DATABASE_URL de forma lazy con validación"""
        required = [self.DB_USER, self.DB_PASSWORD, self.DB_HOST, self.DB_PORT, self.DB_NAME]
        if not all(required):
            missing = []
            if not self.DB_USER: missing.append("DB_USER")
            if not self.DB_PASSWORD: missing.append("DB_PASSWORD")
            if not self.DB_HOST: missing.append("DB_HOST")
            if not self.DB_PORT: missing.append("DB_PORT")
            if not self.DB_NAME: missing.append("DB_NAME")
            raise ValueError(f"Faltan variables de entorno requeridas: {missing}")
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

settings = Settings()
