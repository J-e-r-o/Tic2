from sqlalchemy import Column, Integer, String, Float, DateTime, Text, LargeBinary
from sqlalchemy.sql import func
from database import Base

class Detection(Base):
    """Modelo para almacenar detecciones de objetos"""
    __tablename__ = "detections"
    
    id = Column(Integer, primary_key=True, index=True)
    image_key = Column(String, index=True)  # Clave en S3
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    confidence = Column(Float)
    object_type = Column(String)
    coordinates = Column(Text)  # JSON string con las coordenadas
    s3_url = Column(String)

class ROI(Base):
    """Modelo para almacenar Regiones de Interés"""
    __tablename__ = "rois"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text)
    coordinates = Column(Text)  # JSON string con las coordenadas
    image_key = Column(String)  # Referencia a imagen en S3
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class SimulationResult(Base):
    """Modelo para almacenar resultados de simulaciones"""
    __tablename__ = "simulation_results"
    
    id = Column(Integer, primary_key=True, index=True)
    simulation_name = Column(String, index=True)
    status = Column(String)  # pending, running, completed, failed
    result_data = Column(Text)  # JSON string con resultados
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
