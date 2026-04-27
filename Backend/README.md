# TIC2 Backend - FastAPI + AWS RDS + S3

## 📁 Estructura del Proyecto

```
Backend/
├── main.py                 # Aplicación FastAPI principal
├── config.py              # Configuración (variables de entorno)
├── database.py            # Conexión a RDS PostgreSQL
├── models.py              # Modelos SQLAlchemy para base de datos
├── requirements.txt       # Dependencias Python
├── .env                   # Variables de entorno (NO COMMITEAR)
├── deploy.sh              # Script de deployment para EC2
├── logs/                  # Logs de la aplicación
├── routes/                # Endpoints de la API
│   ├── detect.py         # POST /api/detect/upload-and-detect
│   ├── rois.py           # POST /api/rois/create
│   └── simulate.py       # POST /api/simulate/start
├── utils/                 # Módulos utilitarios
│   ├── detector.py       # Lógica de detección OpenCV (integrado de Edge/)
│   ├── image_processor.py # Procesamiento de imágenes
│   └── helpers.py        # Funciones auxiliares
└── simulator/            # Scripts de simulación (existentes)
```

---

## 🚀 Endpoints de la API

### **1. Detección (Detection)**

#### `POST /api/detect/upload-and-detect`
Sube una imagen a S3, detecta plazas ocupadas/libres y guarda resultado en RDS.

**Request (form-data):**
```
file: <imagen JPG/PNG>
```

**Response (200):**
```json
{
  "status": "success",
  "detection_id": 1,
  "s3_url": "https://bucket.s3.amazonaws.com/detections/...",
  "timestamp": "2025-04-19T10:30:00.123456",
  "total_spots": 5,
  "free_spots": 3,
  "occupied_spots": 2,
  "confidence": 100.0,
  "details": [
    {
      "spot_id": 1,
      "tipo": "normal",
      "estado": "free",
      "densidad": 0.02,
      "confianza": 3.0
    },
    ...
  ]
}
```

#### `GET /api/detect/history?limit=100`
Obtiene historial de últimas detecciones.

---

### **2. ROIs (Region of Interest)**

#### `POST /api/rois/create`
Crea una nueva región de interés (plaza de estacionamiento).

**Request (JSON):**
```json
{
  "name": "Plaza 1",
  "description": "normal",
  "coordinates": [
    [100, 100],
    [200, 100],
    [200, 200],
    [100, 200]
  ]
}
```

**Response (200):**
```json
{
  "id": 1,
  "name": "Plaza 1",
  "description": "normal",
  "coordinates": "[[100, 100], [200, 100], [200, 200], [100, 200]]",
  "created_at": "2025-04-19T10:30:00"
}
```

#### `GET /api/rois/list`
Lista todas las ROIs.

#### `GET /api/rois/{roi_id}`
Obtiene detalles de una ROI específica.

#### `PUT /api/rois/{roi_id}`
Actualiza una ROI existente.

#### `DELETE /api/rois/{roi_id}`
Elimina una ROI específica.

#### `DELETE /api/rois/`
⚠️ Elimina TODAS las ROIs.

---

### **3. Simulación (Simulation)**

#### `POST /api/simulate/start`
Inicia una nueva simulación.

**Request (JSON):**
```json
{
  "name": "Simulación 1",
  "parameters": {
    "duration": 60,
    "vehicle_count": 10
  }
}
```

#### `GET /api/simulate/{simulation_id}`
Obtiene estado de una simulación.

#### `GET /api/simulate/list`
Lista todas las simulaciones.

---

### **4. Health & Status**

#### `GET /health`
Health check para AWS Load Balancer.

**Response:**
```json
{
  "status": "ok",
  "service": "TIC2 API",
  "version": "1.0.0"
}
```

#### `GET /api/status`
Estado detallado de la API (base de datos, S3, etc).

---

## 🔧 Instalación Local

### Pre-requisitos:
- Python 3.9+
- PostgreSQL client (para conectar a RDS)

### Pasos:

```bash
# 1. Clonar y navegar al backend
cd Backend

# 2. Crear virtual environment
python -m venv venv

# En Windows:
venv\Scripts\activate

# En Linux/Mac:
source venv/bin/activate

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Configurar variables de entorno
# Copiar el contenido de .env y rellenar con tus credenciales
# AWS_ACCESS_KEY_ID=xxx
# AWS_SECRET_ACCESS_KEY=xxx
# DB_HOST=xxx.rds.amazonaws.com
# etc...

# 5. Ejecutar la aplicación
python main.py

# O con uvicorn directamente:
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

## ☁️ Deployment en AWS

### AWS Lambda / API Gateway
1. Instala AWS SAM CLI: https://aws.amazon.com/serverless/sam/
2. Configura `aws configure` con tus credenciales AWS.
3. En el directorio `Backend`, ejecuta:

```bash
chmod +x deploy_lambda.sh
./deploy_lambda.sh
```

4. Sigue las preguntas de `sam deploy --guided` y completa los valores de:
   - `S3BucketName`
   - `DBHost`
   - `DBPort`
   - `DBUser`
   - `DBPassword`
   - `DBName`
   - `StageName`

5. El script hace `sam build` y `sam deploy --guided`, por lo que el empaquetado y la creación del API Gateway quedarán cubiertos.

6. Cuando el deploy termine, revisa la salida de la consola: SAM mostrará el `ApiUrl` final del API Gateway.

7. Usa esa URL base con el stage indicado, por ejemplo:
```text
https://<id>.execute-api.<region>.amazonaws.com/Prod/
```

8. A partir de ahí, tus endpoints serán:
   - `GET /health`
   - `POST /api/detect/upload-and-detect`
   - `POST /api/rois/create`

9. Si tu RDS está en VPC privada, añade `VpcConfig` manualmente en `Backend/template.yaml`.

### Pre-requisitos:
1. **RDS PostgreSQL** - Base de datos (cualquier tier, ej: db.t3.micro)
2. **S3 Bucket** - Para almacenar imágenes
3. **Security Group** - Permitir comunicaciones entre Lambda y RDS
4. **IAM User** - Con permisos a S3 y despliegue CloudFormation

### Pasos de Deployment:

#### 1. **Preparar EC2**
```bash
ssh -i tu-key.pem ec2-user@tu-instancia.com

# Una vez dentro de la instancia:
cd /home/ec2-user

# Clonar repositorio
git clone https://github.com/tu-usuario/tic2.git
cd tic2/Backend
```

#### 2. **Ejecutar script de deployment**
```bash
chmod +x deploy.sh
./deploy.sh
```

El script hace:
- Instala Python y dependencias
- Crea virtual environment
- Instala paquetes Python
- Configura archivo `.env`
- Inicia aplicación con Gunicorn

#### 3. **Configurar Web Server (Nginx como proxy)**
```bash
sudo yum install -y nginx

# Crear archivo de configuración
sudo nano /etc/nginx/conf.d/tic2.conf

# Contenido:
upstream tic2_api {
    server localhost:8000;
}

server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://tic2_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Reiniciar Nginx
sudo systemctl restart nginx
```

#### 4. **Usar systemd para ejecutar API permanentemente**
```bash
sudo nano /etc/systemd/system/tic2-api.service

# Contenido:
[Unit]
Description=TIC2 API
After=network.target

[Service]
User=ec2-user
WorkingDirectory=/home/ec2-user/tic2/Backend
ExecStart=/home/ec2-user/tic2/Backend/venv/bin/gunicorn \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    main:app

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target

# Habilitar servicio
sudo systemctl daemon-reload
sudo systemctl enable tic2-api
sudo systemctl start tic2-api
```

---

## 📊 Base de Datos (RDS PostgreSQL)

### Tablas que se crean automáticamente:

#### `detections`
```sql
CREATE TABLE detections (
    id SERIAL PRIMARY KEY,
    image_key VARCHAR,
    timestamp TIMESTAMP,
    confidence FLOAT,
    object_type VARCHAR,
    coordinates TEXT,  -- JSON con detalles
    s3_url VARCHAR
);
```

#### `rois`
```sql
CREATE TABLE rois (
    id SERIAL PRIMARY KEY,
    name VARCHAR,
    description VARCHAR,
    coordinates TEXT,  -- JSON con puntos [x,y]
    image_key VARCHAR,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### `simulation_results`
```sql
CREATE TABLE simulation_results (
    id SERIAL PRIMARY KEY,
    simulation_name VARCHAR,
    status VARCHAR,  -- pending, running, completed, failed
    result_data TEXT,  -- JSON con resultados
    created_at TIMESTAMP,
    completed_at TIMESTAMP
);
```

---

## 🔗 Documentación Interactiva

Una vez corriendo, visita:
- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

---

## 📝 Variables de Entorno (.env)

```env
# AWS Configuration
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
S3_BUCKET=tic2-bucket

# Database Configuration (RDS PostgreSQL)
DB_HOST=tic2-db.c.amazonaws.com
DB_PORT=5432
DB_USER=admin
DB_PASSWORD=SecurePassword123
DB_NAME=tic2_db

# API Configuration
API_PORT=8000
API_HOST=0.0.0.0
DEBUG=False
```

---

## 🔐 Seguridad en Producción

1. **CORS:** Cambiar `allow_origins=["*"]` por hosts específicos
   ```python
   allow_origins=["https://tu-dominio.com"]
   ```

2. **HTTPS:** Usar Let's Encrypt con Nginx
   ```bash
   sudo yum install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d tu-dominio.com
   ```

3. **Secrets:** Usar AWS Secrets Manager en lugar de .env
   ```python
   import boto3
   secrets = boto3.client('secretsmanager')
   secret = secrets.get_secret_value(SecretId='tic2/db_password')
   ```

4. **IAM Roles:** En EC2, usar IAM Role en lugar de credenciales hardcodeadas
   - Crear IAM Role con políticas S3 y RDS
   - Asignar Role a EC2 instance

---

## 🐛 Troubleshooting

### Error: "No module named 'routes'"
```bash
# Asegurarse que estás en el directorio Backend
cd Backend
python main.py
```

### Error: "Connection refused" (RDS)
- Verificar que RDS endpoint es correcto
- Verificar Security Group permite conexiones desde EC2
- Verificar credentials en .env

### Error: "Access Denied" (S3)
- Verificar IAM credentials tienen permiso s3:PutObject
- Verificar nombre del bucket es correcto

### Logs
```bash
# Ver logs en tiempo real
tail -f logs/tic2_api.log

# Ver con filtro
grep ERROR logs/tic2_api.log
```

---

## 📚 Recursos Útiles

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [SQLAlchemy ORM](https://docs.sqlalchemy.org/)
- [Boto3 (AWS SDK)](https://boto3.amazonaws.com/v1/documentation/api/latest/index.html)
- [AWS RDS Documentation](https://docs.aws.amazon.com/rds/)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
