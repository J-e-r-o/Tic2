# GUÍA DE TESTING RÁPIDO

## 1️⃣ Testing Local (Sin Docker)

### Requiere:
- Python 3.9+
- PostgreSQL local o credenciales AWS RDS
- AWS Credentials (si usas S3 real)

### Pasos:

```bash
# 1. Activar venv
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 2. Instalar dependencias
pip install -r requirements.txt

# 3. Configurar .env
# Editar .env y rellenar con variables

# 4. Ejecutar
python main.py

# 5. Acceder
# Swagger UI: http://localhost:8000/docs
# HTTP GET: curl http://localhost:8000/health
```

---

## 2️⃣ Testing con Docker Compose (RECOMENDADO)

### Requiere:
- Docker y Docker Compose instalados
- Credenciales AWS (opcional, Minio simula S3 localmente)

### Pasos:

```bash
# 1. Navegar a carpeta Backend
cd Backend

# 2. Crear archivo .env.docker
cat > .env.docker << EOF
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_REGION=us-east-1
S3_BUCKET=tic2

DB_HOST=postgres
DB_PORT=5432
DB_USER=admin
DB_PASSWORD=password123
DB_NAME=tic2_db

API_PORT=8000
API_HOST=0.0.0.0
DEBUG=False
EOF

# 3. Levantar servicios
docker-compose up -d

# 4. Esperar a que levante (10-15 segundos)
docker-compose logs -f backend

# 5. Verificar salud
curl http://localhost:8000/health

# 6. Ver logs
docker-compose logs -f backend

# 7. Detener
docker-compose down
```

---

## 3️⃣ Testing de Endpoints con CURL

### Health Check
```bash
curl http://localhost:8000/health
```

### Crear una ROI
```bash
curl -X POST http://localhost:8000/api/rois/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Plaza Test",
    "description": "normal",
    "coordinates": [[100, 100], [200, 100], [200, 200], [100, 200]]
  }'
```

### Listar ROIs
```bash
curl http://localhost:8000/api/rois/list
```

### Subir imagen para detectar
```bash
# Necesitas un archivo imagen.jpg en la carpeta actual
curl -X POST -F "file=@imagen.jpg" http://localhost:8000/api/detect/upload-and-detect
```

### Ver historial de detecciones
```bash
curl "http://localhost:8000/api/detect/history?limit=10"
```

---

## 4️⃣ Testing con Thunder Client / Postman

### Importar todas las rutas automáticamente:
```json
// Obtener JSON en: http://localhost:8000/openapi.json
// En Thunder Client o Postman:
// - Import → From URL
// - Pegar: http://localhost:8000/openapi.json
```

---

## 5️⃣ Testing Automatizado con pytest

```bash
# Instalar pytest
pip install pytest pytest-asyncio httpx

# Crear archivo tests/test_api.py
# Ver ejemplo tests/test_api_example.py

# Ejecutar tests
pytest tests/ -v
```

---

## 6️⃣ Logs y Debugging

### Historial de logs
```bash
tail -f logs/tic2_api.log
```

### Ver logs de Docker
```bash
docker-compose logs -f backend
```

### Nivel DEBUG (en .env)
```env
DEBUG=True
```

---

## 7️⃣ Verificar Base de Datos

### Con psql (si tienes PostgreSQL local)
```bash
psql -h localhost -U admin -d tic2_db

# Listar tablas
\dt

# Ver contenido
SELECT * FROM rois;
SELECT * FROM detections;
SELECT * FROM simulation_results;
```

### Con Docker
```bash
docker exec -it tic2-db psql -U admin -d tic2_db

# Dentro de psql
\dt
SELECT * FROM rois;
```

---

## 8️⃣ Workflow Completo de Testing

```bash
# 1. Levantar servicios
docker-compose up -d
docker-compose logs -f backend

# 2. Esperar a que esté listo
sleep 5

# 3. Crear ROIs
bash create_rois_manual.sh

# 4. Verificar ROIs creadas
curl http://localhost:8000/api/rois/list | python3 -m json.tool

# 5. Subir imagen para detectar (con imagen existente)
curl -X POST -F "file=@ruta/a/imagen.jpg" \
  http://localhost:8000/api/detect/upload-and-detect | python3 -m json.tool

# 6. Ver detecciones
curl http://localhost:8000/api/detect/history | python3 -m json.tool

# 7. Ver status general
curl http://localhost:8000/api/status | python3 -m json.tool

# 8. Limpiar
docker-compose down
```

---

## 🔍 Problemas Comunes

### Puerto 8000 ya está en uso
```bash
# Encontrar proceso
lsof -i :8000
# Matar proceso
kill -9 <PID>

# O cambiar puerto en .env y docker-compose.yml
```

### "Database connection refused"
```bash
# Esperar a que PostgreSQL levante
docker-compose logs postgres
# Debe mostrar: "database system is ready to accept connections"
```

### Error de credenciales AWS
```bash
# Si usas Minio localmente, estos valores funcionan:
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin

# Para S3 real, usar credenciales verdaderas
```

### Imagen no se procesa
```bash
# Verificar formato de imagen (JPG o PNG)
file imagen.jpg

# Verificar tamaño
ls -lh imagen.jpg
```

---

## 📊 Verificar Performance

### Tiempo de respuesta
```bash
# Con time
time curl http://localhost:8000/api/rois/list

# Con curl
curl -w "Time: %{time_total}s\n" http://localhost:8000/api/rois/list
```

### Usar ApacheBench para carga
```bash
# Instalar (si no lo tienes)
sudo apt install apache2-utils

# Test de carga: 100 requests, 10 concurrentes
ab -n 100 -c 10 http://localhost:8000/health
```

---

## ✅ Checklist Final

- [ ] Docker Compose levante sin errores
- [ ] Health check responde 200 OK
- [ ] Puedo crear ROIs
- [ ] Puedo listar ROIs
- [ ] Puedo subir imagen y detectar
- [ ] Historial de detecciones visible
- [ ] Logs se escriben correctamente
- [ ] Base de datos tiene datos
- [ ] S3/Minio recibe uploads (si aplica)
