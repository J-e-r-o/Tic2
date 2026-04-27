#!/bin/bash
# TIC2 EC2 Deployment Script
# Lanza instancia EC2 y deploya la aplicación
# Requiere: setup-aws-resources.sh completado

set -e

echo "🚀 TIC2 EC2 Deployment"
echo "======================"

# Variables
PROJECT_NAME="tic2"
AWS_REGION=${AWS_REGION:-"us-east-1"}
INSTANCE_TYPE=${INSTANCE_TYPE:-"t3.micro"}
KEY_NAME=${KEY_NAME:-"tic2-key"}

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

function print_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

# Cargar config
if [ ! -f ../aws-deployment-config.env ]; then
    echo -e "${RED}Error: No se encontró aws-deployment-config.env${NC}"
    echo "Ejecuta primero: ./setup-aws-resources.sh"
    exit 1
fi

source ../aws-deployment-config.env

# ========================
# 1. CREAR KEY PAIR (si no existe)
# ========================
print_step "Verificando Key Pair..."

if ! aws ec2 describe-key-pairs --key-name "$KEY_NAME" --region "$AWS_REGION" &>/dev/null; then
    print_step "Creando Key Pair: $KEY_NAME"
    aws ec2 create-key-pair --key-name "$KEY_NAME" --region "$AWS_REGION" --query 'KeyMaterial' --output text > "${KEY_NAME}.pem"
    chmod 400 "${KEY_NAME}.pem"
    print_step "Key guardada: ${KEY_NAME}.pem"
else
    print_step "Key Pair ya existe: $KEY_NAME"
fi

# ========================
# 2. OBTENER AMI (Amazon Linux 2)
# ========================
print_step "Obteniendo AMI más reciente..."

AMI_ID=$(aws ec2 describe-images \
    --owners amazon \
    --filters "Name=name,Values=amzn2-ami-hvm-*-x86_64-gp2" \
    --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
    --output text \
    --region "$AWS_REGION")

print_step "AMI ID: $AMI_ID"

# ========================
# 3. LANZAR INSTANCIA EC2
# ========================
print_step "Lanzando instancia EC2..."

INSTANCE_ID=$(aws ec2 run-instances \
    --image-id "$AMI_ID" \
    --instance-type "$INSTANCE_TYPE" \
    --key-name "$KEY_NAME" \
    --security-group-ids "$SECURITY_GROUP" \
    --region "$AWS_REGION" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${PROJECT_NAME}-api},{Key=Environment,Value=production}]" \
    --iam-instance-profile Name="${PROJECT_NAME}-ec2-role" \
    --monitoring Enabled=true \
    --query 'Instances[0].InstanceId' \
    --output text 2>/dev/null || true)

if [ -z "$INSTANCE_ID" ]; then
    print_step "Creando IAM Role para EC2 (sin credenciales hardcodeadas)..."
    
    # Crear rol IAM
    ROLE_NAME="${PROJECT_NAME}-ec2-role"
    
    # Trust policy
    cat > /tmp/trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
    
    aws iam create-role --role-name "$ROLE_NAME" --assume-role-policy-document file:///tmp/trust-policy.json 2>/dev/null || true
    
    # Attach policies
    aws iam attach-role-policy --role-name "$ROLE_NAME" --policy-arn "arn:aws:iam::aws:policy/AmazonS3FullAccess" 2>/dev/null || true
    aws iam attach-role-policy --role-name "$ROLE_NAME" --policy-arn "arn:aws:iam::aws:policy/AmazonRDSReadOnlyAccess" 2>/dev/null || true
    
    # Crear instance profile
    aws iam create-instance-profile --instance-profile-name "${ROLE_NAME}" 2>/dev/null || true
    aws iam add-role-to-instance-profile --instance-profile-name "${ROLE_NAME}" --role-name "$ROLE_NAME" 2>/dev/null || true
    
    # Relanzar instancia
    INSTANCE_ID=$(aws ec2 run-instances \
        --image-id "$AMI_ID" \
        --instance-type "$INSTANCE_TYPE" \
        --key-name "$KEY_NAME" \
        --security-group-ids "$SECURITY_GROUP" \
        --region "$AWS_REGION" \
        --iam-instance-profile Name="${ROLE_NAME}" \
        --monitoring Enabled=true \
        --query 'Instances[0].InstanceId' \
        --output text)
fi

print_step "Instancia lanzada: $INSTANCE_ID"

# ========================
# 4. ESPERAR A QUE ESTÉ LISTA
# ========================
print_step "Esperando a que la instancia esté lista (esto toma ~1 minuto)..."

aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$AWS_REGION"

sleep 15

PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text \
    --region "$AWS_REGION")

print_step "IP Pública: $PUBLIC_IP"

# ========================
# 5. CREAR USER DATA SCRIPT
# ========================
print_step "Preparando User Data script..."

cat > /tmp/user-data.sh << 'USERDATA'
#!/bin/bash
set -e

# Update system
yum update -y
yum install -y python3 python3-pip git nginx

# Create app directory
mkdir -p /app/tic2
cd /app

# Clone repository (CAMBIAR URL)
git clone https://github.com/tu-usuario/tic2.git
cd tic2/Backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn

# Create .env file (RELLENAR CON VALORES REALES)
cat > .env << 'ENVFILE'
AWS_ACCESS_KEY_ID=CAMBIAR
AWS_SECRET_ACCESS_KEY=CAMBIAR
AWS_REGION=us-east-1
S3_BUCKET=CAMBIAR

DB_HOST=CAMBIAR.rds.amazonaws.com
DB_PORT=5432
DB_USER=admin
DB_PASSWORD=CAMBIAR
DB_NAME=tic2_db

API_PORT=8000
API_HOST=0.0.0.0
DEBUG=False
ENVFILE

# Configure Gunicorn systemd service
sudo tee /etc/systemd/system/tic2-api.service > /dev/null << 'SERVICE'
[Unit]
Description=TIC2 API
After=network.target

[Service]
User=ec2-user
WorkingDirectory=/app/tic2/Backend
ExecStart=/app/tic2/Backend/venv/bin/gunicorn \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --timeout 120 \
    --access-logfile /var/log/tic2/access.log \
    --error-logfile /var/log/tic2/error.log \
    main:app

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICE

# Create log directory
mkdir -p /var/log/tic2
chown ec2-user:ec2-user /var/log/tic2

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable tic2-api
sudo systemctl start tic2-api

# Configure Nginx as reverse proxy
sudo tee /etc/nginx/conf.d/tic2.conf > /dev/null << 'NGINX'
upstream tic2_api {
    server localhost:8000;
}

server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://tic2_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 120;
        proxy_send_timeout 120;
        proxy_read_timeout 120;
    }

    location /health {
        proxy_pass http://tic2_api;
    }
}
NGINX

sudo systemctl enable nginx
sudo systemctl start nginx

echo "✅ Deployment completado!"
USERDATA

# ========================
# 6. RESUMEN
# ========================
echo ""
echo "=================================================="
echo -e "${GREEN}✅ EC2 LANZADA${NC}"
echo "=================================================="
echo ""
echo "📌 INFORMACIÓN DE INSTANCIA:"
echo "   Instance ID: $INSTANCE_ID"
echo "   IP Pública: $PUBLIC_IP"
echo "   Key Pair: ${KEY_NAME}.pem"
echo ""
echo "🔗 PRÓXIMOS PASOS:"
echo ""
echo "1. CONECTAR VÍA SSH:"
echo "   ssh -i ${KEY_NAME}.pem ec2-user@$PUBLIC_IP"
echo ""
echo "2. ACTUALIZAR .env CON VALORES REALES:"
echo "   - AWS_ACCESS_KEY_ID"
echo "   - AWS_SECRET_ACCESS_KEY"
echo "   - S3_BUCKET"
echo "   - DB_HOST (RDS endpoint)"
echo "   - DB_PASSWORD"
echo ""
echo "3. VERIFICAR ESTADO:"
echo "   curl http://$PUBLIC_IP/health"
echo "   curl http://$PUBLIC_IP/docs"
echo ""
echo "⚠️  GUARDAR EL KEY PAIR EN LUGAR SEGURO"
echo "=================================================="

# Guardar metadata
cat >> ../aws-deployment-config.env << EOF

# EC2
EC2_INSTANCE_ID=$INSTANCE_ID
EC2_PUBLIC_IP=$PUBLIC_IP
EC2_KEY_NAME=$KEY_NAME
EOF

echo ""
echo "Metadata guardada en: aws-deployment-config.env"
