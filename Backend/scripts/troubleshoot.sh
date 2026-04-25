#!/bin/bash
# TIC2 Deployment Quick Troubleshooting

set -e

AWS_REGION=${AWS_REGION:-"us-east-1"}

if [ ! -f ../aws-deployment-config.env ]; then
    echo "❌ No encontrado: aws-deployment-config.env"
    exit 1
fi

source ../aws-deployment-config.env

echo "🔧 TIC2 Troubleshooting"
echo "======================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

function section() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

function show_issue() {
    echo -e "${RED}❌ PROBLEMA: $1${NC}"
    shift
    while [ $# -gt 0 ]; do
        echo "   $1"
        shift
    done
    echo ""
}

function show_solution() {
    echo -e "${GREEN}✓ SOLUCIÓN:${NC}"
    shift
    while [ $# -gt 0 ]; do
        echo "   $1"
        shift
    done
    echo ""
}

# ========================
# 1. VERIFICAR RECURSOS AWS
# ========================
section "1. VERIFICAR RECURSOS AWS"

echo "S3 Bucket: $S3_BUCKET"
if aws s3 ls "s3://${S3_BUCKET}" &>/dev/null; then
    echo "   ✅ Existe y es accesible"
else
    show_issue "No se puede acceder al S3 bucket"
    show_solution "Verificar que el bucket existe" \
                  "Verificar credenciales AWS" \
                  "Ejecutar: aws s3 ls para listar buckets" \
                  "Problema: Nombre de bucket incorrecto en .env"
fi

echo "RDS Instance: $RDS_INSTANCE"
if aws rds describe-db-instances --db-instance-identifier "$RDS_INSTANCE" --region "$AWS_REGION" &>/dev/null; then
    RDS_STATUS=$(aws rds describe-db-instances --db-instance-identifier "$RDS_INSTANCE" \
        --region "$AWS_REGION" --query 'DBInstances[0].DBInstanceStatus' --output text)
    
    if [ "$RDS_STATUS" = "available" ]; then
        echo "   ✅ RDS está AVAILABLE"
    else
        echo "   ⏳ RDS Status: $RDS_STATUS (esperando)"
        show_solution "Esperar a que RDS esté en estado 'available'" \
                      "Esto puede tomar 5-10 minutos"
    fi
else
    show_issue "RDS Instance no existe"
    show_solution "Ejecutar: ./setup-aws-resources.sh"
fi

echo "EC2 Instance: $EC2_INSTANCE_ID"
if aws ec2 describe-instances --instance-ids "$EC2_INSTANCE_ID" --region "$AWS_REGION" &>/dev/null; then
    EC2_STATUS=$(aws ec2 describe-instances --instance-ids "$EC2_INSTANCE_ID" \
        --region "$AWS_REGION" --query 'Reservations[0].Instances[0].State.Name' --output text)
    
    if [ "$EC2_STATUS" = "running" ]; then
        echo "   ✅ EC2 está RUNNING"
    else
        echo "   ⏳ EC2 Status: $EC2_STATUS"
    fi
else
    show_issue "EC2 Instance no existe"
    show_solution "Ejecutar: ./setup-ec2.sh"
fi

echo ""

# ========================
# 2. VERIFICAR CONECTIVIDAD
# ========================
section "2. VERIFICAR CONECTIVIDAD"

if [ ! -z "$EC2_PUBLIC_IP" ]; then
    echo "Intentando conectar a EC2: $EC2_PUBLIC_IP:80"
    
    if timeout 5 nc -zv "$EC2_PUBLIC_IP" 80 &>/dev/null; then
        echo "   ✅ Puerto 80 accesible"
    else
        show_issue "No se puede conectar a puerto 80"
        show_solution \
            "Verificar que Security Group permite tráfico HTTP" \
            "Verificar que Nginx está corriendo: sudo systemctl status nginx" \
            "Ver logs: sudo tail -f /var/log/nginx/error.log"
    fi
    
    # Probar health endpoint
    echo "Intentando conectar a Health endpoint..."
    if response=$(curl -s -w "\n%{http_code}" "http://${EC2_PUBLIC_IP}/health" 2>&1); then
        status_code=$(echo "$response" | tail -n1)
        body=$(echo "$response" | head -n-1)
        
        if [ "$status_code" = "200" ]; then
            echo "   ✅ API respondiendo (200 OK)"
            echo "   Response: $body"
        else
            echo "   ❌ API respondió con status: $status_code"
            show_solution "Verificar logs de la aplicación" \
                          "SSH a EC2: ssh -i ${EC2_KEY_NAME}.pem ec2-user@${EC2_PUBLIC_IP}" \
                          "Ver logs: sudo tail -f /var/log/tic2/error.log"
        fi
    else
        show_issue "No se puede conectar a API"
        show_solution "Verificar que EC2 está en running" \
                      "Verificar IP pública en AWS Console" \
                      "Intentar SSH manualmente para ver logs"
    fi
fi

echo ""

# ========================
# 3. VERIFICAR BASE DE DATOS
# ========================
section "3. VERIFICAR BASE DE DATOS RDS"

echo "Endpoint: $DB_HOST"
echo "Usuario: $DB_USER"
echo "Database: $DB_NAME"
echo ""

if command -v psql &> /dev/null; then
    echo "Intentando conectar a RDS con psql..."
    if timeout 10 psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &>/dev/null; then
        echo "   ✅ Conexión exitosa"
        
        # Listar tablas
        psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "\dt"
    else
        show_issue "No se puede conectar a RDS"
        show_solution "Verificar que RDS está en estado 'available'" \
                      "Verificar endpoint correcto: $DB_HOST" \
                      "Verificar credenciales en .env" \
                      "Verificar Security Group permite puerto 5432"
    fi
else
    echo "⚠️ psql no instalado, saltando test"
    echo "   Instalarlo con: brew install postgresql (Mac) o apt install postgresql-client (Linux)"
fi

echo ""

# ========================
# 4. VERIFICAR .ENV
# ========================
section "4. VERIFICAR ARCHIVO .env"

ENV_FILE="../.env"
if [ ! -f "$ENV_FILE" ]; then
    show_issue "Archivo .env no encontrado"
    show_solution "Crear .env con: cp .env.example .env" \
                  "O editar manualmente con valores de aws-deployment-config.env"
else
    echo "✅ Archivo .env existe"
    echo ""
    echo "Variables críticas:"
    
    for var in "AWS_ACCESS_KEY_ID" "AWS_SECRET_ACCESS_KEY" "S3_BUCKET" "DB_HOST" "DB_USER" "DB_PASSWORD"; do
        if grep -q "^${var}=" "$ENV_FILE"; then
            value=$(grep "^${var}=" "$ENV_FILE" | cut -d= -f2)
            if [ -z "$value" ] || [ "$value" = "CAMBIAR" ]; then
                echo "   ⚠️  $var = (VACÍO o no configurado)"
            else
                # Mostrar solo primeros caracteres por seguridad
                short_value=$(echo "$value" | cut -c1-5)..."
                echo "   ✅ $var = ${short_value}"
            fi
        else
            echo "   ❌ $var = (NO EXISTE)"
        fi
    done
fi

echo ""

# ========================
# 5. VERIFICAR LOGS
# ========================
section "5. LOGS RECIENTES"

if [ ! -z "$EC2_PUBLIC_IP" ]; then
    echo "Para ver logs en EC2, conectar con SSH:"
    echo ""
    echo "ssh -i ${EC2_KEY_NAME}.pem ec2-user@${EC2_PUBLIC_IP}"
    echo ""
    echo "Luego ejecutar:"
    echo "  - Logs de aplicación: tail -f /var/log/tic2/error.log"
    echo "  - Logs de Nginx: tail -f /var/log/nginx/error.log"
    echo "  - Status: sudo systemctl status tic2-api"
    echo "  - Restart: sudo systemctl restart tic2-api"
fi

echo ""

# ========================
# 6. RESUMEN
# ========================
section "RESUMEN"

echo "Para diagnósticos completos, verificar en este orden:"
echo ""
echo "1️⃣  Recursos existen en AWS → CloudWatch Console"
echo "2️⃣  EC2 puede conectarse a Internet → Security Group"
echo "3️⃣  RDS está 'available' → RDS Console"
echo "4️⃣  Credenciales en .env son correctas → Salida de setup-aws-resources.sh"
echo "5️⃣  Logs en EC2 no muestran errores → SSH + tail"
echo ""
echo "Links útiles:"
echo "  - EC2: https://console.aws.amazon.com/ec2/"
echo "  - RDS: https://console.aws.amazon.com/rds/"
echo "  - S3: https://console.aws.amazon.com/s3/"
echo "  - CloudWatch: https://console.aws.amazon.com/cloudwatch/"
echo ""
