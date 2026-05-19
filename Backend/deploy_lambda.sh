#!/bin/bash
set -e
cd "$(dirname "$0")"

if ! command -v sam >/dev/null 2>&1; then
  echo "ERROR: AWS SAM CLI no encontrado. Instala https://aws.amazon.com/serverless/sam/"
  exit 1
fi

# Usa AWS_REGION o AWS_DEFAULT_REGION, y por defecto us-east-2 si no está configurado.
REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-2}}"

echo "Construyendo Lambda usando contenedor..."
sam build --use-container

echo "Desplegando stack 'tic2-backend-lambda' en la región ${REGION}..."
sam deploy --stack-name tic2-backend-lambda --region "$REGION" --guided --capabilities CAPABILITY_IAM

echo "Despliegue completado. Revisa la salida para la URL del API Gateway."
