# TIC2 AWS DEPLOYMENT - QUICK START

## 🚀 Resumen Ultra-Rápido (10 minutos)

### Requisitos
```bash
# 1. Instalar AWS CLI
pip install awscli

# 2. Configurar
aws configure
# Ingresar: Access Key, Secret Key, Region (us-east-1), Output Format (json)

# 3. Verificar
aws sts get-caller-identity
```

---

## 🎯 Pasos de Deployment

### Opción Lambda + API Gateway (opcional)
```bash
cd Backend
chmod +x deploy_lambda.sh
./deploy_lambda.sh
```

Sigue los prompts de SAM y completa los parámetros:
- `S3BucketName`
- `DBHost`
- `DBPort`
- `DBUser`
- `DBPassword`
- `DBName`
- `StageName`

La salida de `sam deploy` mostrará el URL del API Gateway.

### PASO 1: Setup AWS Resources (5 min)
```bash
cd Backend/scripts
chmod +x *.sh

./setup-aws-resources.sh
# Cuando pida IP, ir a: https://www.whatismyipaddress.com/

# ⏰ ESPERAR 10 MINUTOS a que RDS esté listo (Status: available)
# Verificar en: AWS Console → RDS → tic2-db
```

### PASO 2: Lanzar EC2 (2 min)
```bash
./setup-ec2.sh
# Apunta la Public IP y el Key Name (tic2-key.pem)
```

### PASO 3: Conectar a EC2 e instalar
```bash
# Desde tu máquina (mismo directorio donde está tic2-key.pem)
ssh -i tic2-key.pem ec2-user@<PUBLIC_IP>

# Una vez dentro de EC2:
cd /app/tic2/Backend

# Editar .env
nano .env

# Cambiar:
# - AWS_ACCESS_KEY_ID=tu_clave
# - AWS_SECRET_ACCESS_KEY=tu_secreto
# - S3_BUCKET=nombre_del_bucket
# - DB_HOST=tic2-db.xxxxx.rds.amazonaws.com
# - DB_PASSWORD=tu_password

# Guardar: Ctrl+O, Enter, Ctrl+X

# Obtener RDS endpoint (desde tu máquina local, otra terminal):
aws rds describe-db-instances --db-instance-identifier tic2-db \
  --query 'DBInstances[0].Endpoint.Address' --output text
# Copiar resultado y pegarlo en DB_HOST
```

### PASO 4: Restartear y Verificar
```bash
# En EC2:
sudo systemctl restart tic2-api
sudo systemctl status tic2-api

# Ver logs si hay error
tail -f /var/log/tic2/error.log
```

### PASO 5: Probar desde tu máquina
```bash
# Health check
curl http://<PUBLIC_IP>/health

# Swagger UI (en navegador)
http://<PUBLIC_IP>/docs

# Crear una ROI
curl -X POST http://<PUBLIC_IP>/api/rois/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Plaza 1",
    "description": "normal",
    "coordinates": [[100, 100], [200, 100], [200, 200], [100, 200]]
  }'
```

---

## ✅ Checklist

- [ ] AWS CLI instalado
- [ ] `aws configure` ejecutado
- [ ] `./setup-aws-resources.sh` completado
- [ ] RDS en status "available"
- [ ] `./setup-ec2.sh` completado
- [ ] SSH conectado a EC2
- [ ] .env actualizado en EC2
- [ ] `systemctl restart tic2-api` ok
- [ ] `curl /health` retorna 200

---

## 🔗 URLs útiles después de deploy

| URL | Descripción |
|-----|-------------|
| `http://<IP>/health` | Health check |
| `http://<IP>/docs` | Swagger UI |
| `http://<IP>/api/status` | Status detallado |

---

## 🆘 Problemas Más Comunes

| Problema | Solución |
|----------|----------|
| **SSH timeout** | Verificar Security Group puerto 22, tu IP en whitelist |
| **RDS connection refused** | Esperar a que esté en status "available" (5-10 min) |
| **API error 500** | Ver logs: `tail -f /var/log/tic2/error.log` |
| **S3 upload fails** | Verificar credenciales y nombre bucket en .env |
| **No puedo conectar a EC2** | IP pública puede cambiar, obtener de AWS Console |

---

## 💾 Archivos Críticos (Guardar en LUGAR SEGURO)

```
aws-deployment-config.env    ← TODAS las credenciales
tic2-key.pem                 ← Llave SSH (¡NO PERDER!)
Backend/.env                 ← Config de EC2
```

**NUNCA** subirlos a GitHub.

---

## 📊 Costos (Primer año)

- EC2 t3.micro: **$0** (free tier)
- RDS db.t3.micro: **$0** (free tier)
- S3: **$0** (5GB free)
- **TOTAL: $0-5 USD/mes**

(Después del año 1: ~$18/mes)

---

## 🔧 Troubleshooting

```bash
cd Backend/scripts
./troubleshoot.sh
# Esto verifica todos los recursos automáticamente
```

---

## 📚 Guías Completas

- Deployment detallado: `AWS_DEPLOYMENT_GUIDE.md`
- Testing local: `TESTING_GUIDE.md`

---

**¡LISTO! Tu API está en AWS 🎉**
