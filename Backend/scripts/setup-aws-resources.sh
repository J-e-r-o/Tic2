#!/bin/bash
# TIC2 AWS Deployment Setup Script
# Configura RDS, S3 e IAM automáticamente
# Requiere: AWS CLI configurado (aws configure)

set -e

echo "🚀 TIC2 AWS Deployment Setup"
echo "=============================="
echo ""

# Variables
PROJECT_NAME="tic2"
AWS_REGION=${AWS_REGION:-"us-east-1"}
ENVIRONMENT=${ENVIRONMENT:-"production"}
INSTANCE_TYPE=${INSTANCE_TYPE:-"t3.micro"}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

function print_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

function print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

function print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar AWS CLI
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI no está instalado"
    echo "Instálalo con: pip install awscli"
    exit 1
fi

# Verificar credenciales
print_step "Verificando credenciales AWS..."
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "Credenciales AWS no configuradas"
    echo "Ejecuta: aws configure"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
print_step "Cuenta AWS: $ACCOUNT_ID"

# ========================
# 1. IAM USER + ACCESS KEYS
# ========================
print_step "Creando IAM User para la aplicación..."

IAM_USER="${PROJECT_NAME}-app-user"

# Crear usuario (si no existe)
if ! aws iam get-user --user-name "$IAM_USER" 2>/dev/null; then
    aws iam create-user --user-name "$IAM_USER"
    print_step "IAM User creado: $IAM_USER"
else
    print_warning "IAM User ya existe: $IAM_USER"
fi

# Crear política S3
print_step "Creando política S3..."

S3_POLICY='{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::'"${PROJECT_NAME}"'-bucket",
        "arn:aws:s3:::'"${PROJECT_NAME}"'-bucket/*"
      ]
    }
  ]
}'

echo "$S3_POLICY" > /tmp/s3-policy.json
aws iam put-user-policy --user-name "$IAM_USER" --policy-name "S3Access" --policy-document file:///tmp/s3-policy.json

# ========================
# 2. S3 BUCKET
# ========================
print_step "Creando S3 Bucket..."

S3_BUCKET="${PROJECT_NAME}-bucket-$(date +%s)"

if aws s3 ls "s3://${S3_BUCKET}" 2>/dev/null; then
    print_warning "Bucket ya existe: $S3_BUCKET"
else
    aws s3 mb "s3://${S3_BUCKET}" --region "$AWS_REGION"
    aws s3api put-bucket-versioning --bucket "$S3_BUCKET" --versioning-configuration Status=Enabled
    print_step "Bucket creado: $S3_BUCKET"
fi

# ========================
# 3. RDS POSTGRES
# ========================
print_step "Creando RDS PostgreSQL..."

RDS_INSTANCE="${PROJECT_NAME}-db"
DB_USER="admin"
DB_PASSWORD=$(openssl rand -base64 16)
DB_NAME="${PROJECT_NAME}_db"

aws rds create-db-instance \
    --db-instance-identifier "$RDS_INSTANCE" \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --engine-version 15.3 \
    --master-username "$DB_USER" \
    --master-user-password "$DB_PASSWORD" \
    --db-name "$DB_NAME" \
    --allocated-storage 20 \
    --storage-type gp2 \
    --no-publicly-accessible \
    --region "$AWS_REGION" \
    2>/dev/null || print_warning "RDS instance ya existe o error"

print_step "RDS instance: $RDS_INSTANCE"
print_warning "Esperar 5-10 minutos para que RDS esté listo..."

# ========================
# 4. SECURITY GROUP (EC2)
# ========================
print_step "Configurando Security Group..."

VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query 'Vpcs[0].VpcId' --output text)

SG_NAME="${PROJECT_NAME}-sg"
SG_ID=$(aws ec2 create-security-group \
    --group-name "$SG_NAME" \
    --description "Security group para TIC2 API" \
    --vpc-id "$VPC_ID" \
    --region "$AWS_REGION" \
    --query 'GroupId' \
    --output text 2>/dev/null || \
    aws ec2 describe-security-groups --filters "Name=group-name,Values=$SG_NAME" --query 'SecurityGroups[0].GroupId' --output text)

# Permitir HTTP (80) y HTTPS (443)
aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --protocol tcp --port 80 --cidr 0.0.0.0/0 \
    --region "$AWS_REGION" 2>/dev/null || true

aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --protocol tcp --port 443 --cidr 0.0.0.0/0 \
    --region "$AWS_REGION" 2>/dev/null || true

# SSH (puerto 22) - SOLO DESDE TU IP (CAMBIAR)
read -p "¿Cuál es tu IP pública? (para SSH, ej: 1.2.3.4): " YOUR_IP
if [ ! -z "$YOUR_IP" ]; then
    aws ec2 authorize-security-group-ingress \
        --group-id "$SG_ID" \
        --protocol tcp --port 22 --cidr "${YOUR_IP}/32" \
        --region "$AWS_REGION" 2>/dev/null || true
fi

print_step "Security Group: $SG_ID"

# ========================
# 5. CREAR ARCHIVO DE CONFIGURACIÓN
# ========================
print_step "Generando archivo de configuración..."

cat > ../aws-deployment-config.env << EOF
# AWS Deployment Configuration
# Generado: $(date)

# AWS
AWS_ACCOUNT_ID=$ACCOUNT_ID
AWS_REGION=$AWS_REGION
AWS_IAM_USER=$IAM_USER

# S3
S3_BUCKET=$S3_BUCKET

# RDS
RDS_INSTANCE=$RDS_INSTANCE
DB_HOST=<OBTENER ENDPOINT DESPUÉS>
DB_PORT=5432
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME

# EC2
INSTANCE_TYPE=$INSTANCE_TYPE
SECURITY_GROUP=$SG_ID
VPC_ID=$VPC_ID

# API
API_PORT=8000
API_HOST=0.0.0.0
DEBUG=False
ENVIRONMENT=$ENVIRONMENT
EOF

print_step "Config guardada en: aws-deployment-config.env"

# ========================
# 6. CREAR ACCESS KEYS
# ========================
print_step "Creando Access Keys para IAM User..."

KEYS=$(aws iam create-access-key --user-name "$IAM_USER" --query 'AccessKey' --output json)
ACCESS_KEY=$(echo "$KEYS" | grep '"AccessKeyId"' | cut -d'"' -f4)
SECRET_KEY=$(echo "$KEYS" | grep '"SecretAccessKey"' | cut -d'"' -f4)

cat >> ../aws-deployment-config.env << EOF

# AWS Credentials (GUARDAR EN SECRETO)
AWS_ACCESS_KEY_ID=$ACCESS_KEY
AWS_SECRET_ACCESS_KEY=$SECRET_KEY
EOF

# ========================
# 7. RESUMEN
# ========================
echo ""
echo "=================================================="
echo -e "${GREEN}✅ SETUP COMPLETADO${NC}"
echo "=================================================="
echo ""
echo "📋 INFORMACIÓN IMPORTANTE:"
echo ""
echo "1. S3 BUCKET:"
echo "   Nombre: $S3_BUCKET"
echo ""
echo "2. RDS POSTGRES:"
echo "   Instance: $RDS_INSTANCE"
echo "   User: $DB_USER"
echo "   Password: $DB_PASSWORD"
echo "   Database: $DB_NAME"
echo "   ⚠️  ESPERAR 5-10 MINUTOS PARA QUE ESTÉ LISTO"
echo ""
echo "3. SECURITY GROUP:"
echo "   ID: $SG_ID"
echo ""
echo "4. IAM USER:"
echo "   Usuario: $IAM_USER"
echo "   Access Key ID: $ACCESS_KEY"
echo "   Secret Access Key: $SECRET_KEY"
echo ""
echo "📁 Archivo de config guardado en:"
echo "   ../aws-deployment-config.env"
echo ""
echo "⚠️  GUARDAR ESTE INFORMACIÓN EN UN LUGAR SEGURO"
echo ""
echo "🔗 PRÓXIMOS PASOS:"
echo "   1. Esperar a que RDS esté listo (Status: available)"
echo "   2. Ejecutar: ./setup-ec2.sh"
echo "   3. Configurar RDS endpoint en .env"
echo ""
echo "=================================================="
