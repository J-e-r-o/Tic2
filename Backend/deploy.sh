#!/bin/bash
# Script de deployment para EC2 en AWS

# Variables
APP_DIR="/home/ec2-user/tic2-backend"
REPO_URL="https://github.com/tu-usuario/tic2.git"

# Actualizar sistema
sudo yum update -y
sudo yum install -y python3 python3-pip git

# Clonar repositorio
cd /home/ec2-user
git clone $REPO_URL

# Navegar al backend
cd $APP_DIR/Backend

# Crear virtual environment
python3 -m venv venv
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt
pip install gunicorn

# Crear archivo de variables de entorno (MODIFICAR CON TUS VALORES)
cat > .env << EOF
AWS_ACCESS_KEY_ID=tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key
AWS_REGION=us-east-1
S3_BUCKET=tu-bucket

DB_HOST=tu-rds-endpoint.amazonaws.com
DB_PORT=5432
DB_USER=admin
DB_PASSWORD=tu_password
DB_NAME=tic2_db

API_PORT=8000
API_HOST=0.0.0.0
DEBUG=False
EOF

# Correr migraciones (si es necesario)
# python -m alembic upgrade head

# Iniciar aplicación con Gunicorn
gunicorn --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 main:app

# Para ejecutar en background:
# nohup gunicorn --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 main:app > app.log 2>&1 &
