#!/bin/bash
# TIC2 AWS Management Commands
# Comandos útiles para managing tu deployment

set -e

if [ ! -f ../aws-deployment-config.env ]; then
    echo "❌ Archivo aws-deployment-config.env no encontrado"
    exit 1
fi

source ../aws-deployment-config.env

echo "🛠️  TIC2 AWS Management"
echo "======================"
echo ""

function show_command() {
    echo "$ $1"
    echo "  # $2"
    echo ""
}

echo "📊 MONITOREO"
echo "───────────"
echo ""

show_command "aws ec2 describe-instances --instance-ids $EC2_INSTANCE_ID --region $AWS_REGION" \
            "Ver estado de EC2"

show_command "aws rds describe-db-instances --db-instance-identifier $RDS_INSTANCE --region $AWS_REGION" \
            "Ver estado de RDS"

show_command "aws s3 ls s3://$S3_BUCKET --summarize" \
            "Ver contenido y tamaño de S3"

echo ""
echo "🔄 OPERACIONES"
echo "──────────────"
echo ""

show_command "ssh -i ${EC2_KEY_NAME}.pem ec2-user@$EC2_PUBLIC_IP" \
            "Conectar a EC2 mediante SSH"

show_command "sudo systemctl restart tic2-api" \
            "Restartear API (ejecutar dentro de EC2)"

show_command "sudo systemctl status tic2-api" \
            "Ver status de API (ejecutar dentro de EC2)"

show_command "tail -f /var/log/tic2/error.log" \
            "Ver logs en tiempo real (ejecutar dentro de EC2)"

echo ""
echo "💾 BACKUP & RESTORE"
echo "───────────────────"
echo ""

show_command "aws rds create-db-snapshot --db-instance-identifier $RDS_INSTANCE --db-snapshot-identifier tic2-backup-$(date +%s) --region $AWS_REGION" \
            "Crear snapshot de RDS"

show_command "aws s3 sync s3://$S3_BUCKET ./backup --region $AWS_REGION" \
            "Descargar todos los archivos de S3"

echo ""
echo "📈 SCALING"
echo "──────────"
echo ""

echo "EC2 (cambiar tipo de instancia):"
show_command "# 1. Detener instancia"
show_command "2. Ir a EC2 Console → Right click → Instance Settings → Change Instance Type"
show_command "3. Seleccionar nuevo tipo (ej: t3.small, t3.medium)"
show_command "4. Restartear"

echo ""
echo "RDS (aumentar recursos):"
show_command "# Ir a RDS Console → tic2-db → Modify"
show_command "# Cambiar: Instance class, Storage, etc."

echo ""
echo "💰 COSTOS"
echo "─────────"
echo ""

show_command "aws ce get-cost-and-usage --time-period Start=$(date -d '30 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) --granularity MONTHLY --metrics 'BlendedCost' --group-by Type=DIMENSION,Key=SERVICE --region $AWS_REGION" \
            "Ver costos últimos 30 días"

echo ""
echo "🗑️  CLEANUP (ELIMINAR RECURSOS)"
echo "──────────────────────────────"
echo ""
echo "⚠️  ADVERTENCIA: Estos comandos eliminarán datos permanentemente"
echo ""

show_command "aws ec2 terminate-instances --instance-ids $EC2_INSTANCE_ID --region $AWS_REGION" \
            "Eliminar EC2"

show_command "aws rds delete-db-instance --db-instance-identifier $RDS_INSTANCE --skip-final-snapshot --region $AWS_REGION" \
            "Eliminar RDS"

show_command "aws s3 rm s3://$S3_BUCKET --recursive" \
            "Vaciar S3 bucket"

show_command "aws s3 rb s3://$S3_BUCKET" \
            "Eliminar S3 bucket"

show_command "aws ec2 delete-security-group --group-id $SECURITY_GROUP --region $AWS_REGION" \
            "Eliminar Security Group"

echo ""
echo "📋 SCRIPT PARA WORKFLOW COMPLETO"
echo "─────────────────────────────────"
echo ""

cat > /tmp/tic2-daily-check.sh << 'SCRIPT'
#!/bin/bash
# Script para verificación diaria

source ../aws-deployment-config.env

echo "=== Health Check ==="
curl -s http://$EC2_PUBLIC_IP/health | jq .

echo ""
echo "=== EC2 Status ==="
aws ec2 describe-instances --instance-ids $EC2_INSTANCE_ID \
    --query 'Reservations[0].Instances[0].[State.Name,PublicIpAddress]' \
    --output table

echo ""
echo "=== RDS Status ==="
aws rds describe-db-instances --db-instance-identifier $RDS_INSTANCE \
    --query 'DBInstances[0].[DBInstanceStatus,AllocatedStorage]' \
    --output table

echo ""
echo "=== S3 Usage ==="
aws s3 ls s3://$S3_BUCKET --summarize
SCRIPT

echo "Guardado en: /tmp/tic2-daily-check.sh"
echo ""

echo "📞 SOPORTE RÁPIDO"
echo "────────────────"
echo ""
echo "Documentación completa:"
echo "  - AWS_DEPLOYMENT_GUIDE.md"
echo "  - AWS_QUICK_START.md"
echo "  - README.md"
echo ""
echo "Troubleshooting:"
echo "  bash ./troubleshoot.sh"
echo ""
