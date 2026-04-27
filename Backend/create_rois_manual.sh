#!/bin/bash
# Script para crear tabla de ROIs desde línea de comandos (testing manual)

# Este script requiere tener configuradas las variables de ambiente:
# DB_HOST, DB_USER, DB_PASSWORD, DB_NAME

# Ejemplo de uso:
# ./create_rois_manual.sh

API_URL="http://localhost:8000"

echo "🚀 Creando ROIs de prueba..."

# ROI 1 - Plaza normal
curl -X POST "$API_URL/api/rois/create" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Plaza 1",
    "description": "normal",
    "coordinates": [[100, 100], [200, 100], [200, 200], [100, 200]]
  }'

echo -e "\n"

# ROI 2 - Plaza normal
curl -X POST "$API_URL/api/rois/create" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Plaza 2",
    "description": "normal",
    "coordinates": [[250, 100], [350, 100], [350, 200], [250, 200]]
  }'

echo -e "\n"

# ROI 3 - Plaza para discapacitados
curl -X POST "$API_URL/api/rois/create" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Plaza Discapacitados A",
    "description": "discapacitado",
    "coordinates": [[400, 100], [500, 100], [500, 200], [400, 200]]
  }'

echo -e "\n"

# ROI 4 - Plaza normal
curl -X POST "$API_URL/api/rois/create" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Plaza 3",
    "description": "normal",
    "coordinates": [[550, 100], [650, 100], [650, 200], [550, 200]]
  }'

echo -e "\n"

# ROI 5 - Plaza normal
curl -X POST "$API_URL/api/rois/create" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Plaza 4",
    "description": "normal",
    "coordinates": [[100, 250], [200, 250], [200, 350], [100, 350]]
  }'

echo -e "\n✅ ROIs de prueba creadas!\n"

# Listar las ROIs creadas
echo "📋 Listando ROIs..."
curl -X GET "$API_URL/api/rois/list" | python3 -m json.tool

echo -e "\n"
