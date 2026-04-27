#!/bin/bash
set -e
cd "$(dirname "$0")"

if ! command -v sam >/dev/null 2>&1; then
  echo "ERROR: AWS SAM CLI no encontrado. Instala https://aws.amazon.com/serverless/sam/"
  exit 1
fi

echo "Construyendo Lambda..."
sam build

echo "Desplegando stack 'tic2-backend-lambda'..."
sam deploy --stack-name tic2-backend-lambda --guided --capabilities CAPABILITY_IAM

echo "Despliegue completado. Revisa la salida para la URL del API Gateway."
