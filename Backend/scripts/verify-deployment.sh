#!/bin/bash
# TIC2 Deployment Verification
# Verifica que todo esté correctamente deployado

set -e

AWS_REGION=${AWS_REGION:-"us-east-1"}

echo "🔍 Verificando TIC2 Deployment en AWS"
echo "======================================"
echo ""

if [ ! -f ../aws-deployment-config.env ]; then
    echo "❌ No se encontró aws-deployment-config.env"
    exit 1
fi

source ../aws-deployment-config.env

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

CHECKS_PASSED=0
CHECKS_TOTAL=0

function check() {
    CHECKS_TOTAL=$((CHECKS_TOTAL+1))
    local check_name=$1
    local command=$2
    
    echo -n "Verificando $check_name... "
    
    if eval "$command" &>/dev/null; then
        echo -e "${GREEN}✅${NC}"
        CHECKS_PASSED=$((CHECKS_PASSED+1))
    else
        echo -e "${RED}❌${NC}"
    fi
}

# ========================
# VERIFICACIONES
# ========================

echo "☁️ RECURSOS AWS:"
check "S3 Bucket" "aws s3 ls s3://${S3_BUCKET}"
check "RDS Instance" "aws rds describe-db-instances --db-instance-identifier ${RDS_INSTANCE} --region ${AWS_REGION}"
check "EC2 Instance" "aws ec2 describe-instances --instance-ids ${EC2_INSTANCE_ID} --region ${AWS_REGION}"
check "Security Group" "aws ec2 describe-security-groups --group-ids ${SECURITY_GROUP} --region ${AWS_REGION}"

echo ""
echo "🌐 CONECTIVIDAD:"

if [ ! -z "$EC2_PUBLIC_IP" ]; then
    check "SSH accesible" "nc -zv ${EC2_PUBLIC_IP} 22"
    check "HTTP activo" "curl -s -o /dev/null -w '%{http_code}' http://${EC2_PUBLIC_IP}/health"
    check "API disponible" "curl -s http://${EC2_PUBLIC_IP}/ | grep -q 'TIC2'"
fi

echo ""
echo "🗄️ BASE DE DATOS:"

if command -v psql &> /dev/null; then
    check "RDS accessible" "psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} -c 'SELECT 1' 2>/dev/null"
fi

echo ""
echo "📦 APLICACIÓN:"

if [ ! -z "$EC2_PUBLIC_IP" ]; then
    check "Health endpoint" "curl -sf http://${EC2_PUBLIC_IP}/health"
    check "Swagger docs" "curl -s http://${EC2_PUBLIC_IP}/docs | grep -q 'swagger'"
fi

# ========================
# RESUMEN
# ========================
echo ""
echo "======================================"
echo -e "Verificaciones: ${GREEN}${CHECKS_PASSED}/${CHECKS_TOTAL}${NC} pasadas"
echo "======================================"

if [ "$CHECKS_PASSED" -eq "$CHECKS_TOTAL" ]; then
    echo -e "${GREEN}✅ TODO OK - DEPLOYMENT EXITOSO${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️ ALGUNAS VERIFICACIONES FALLARON${NC}"
    echo ""
    echo "Tips:"
    echo "- RDS tarda 5-10 minutos en estar listo"
    echo "- EC2 tarda 2-3 minutos en iniciar la aplicación"
    echo "- Verificar security groups permiten tráfico"
    exit 1
fi
