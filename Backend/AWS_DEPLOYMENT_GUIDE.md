# AWS DEPLOYMENT GUIDE - PASO A PASO

## 🎯 Objetivo
Desplegar TIC2 Backend en AWS con RDS (BD), S3 (imágenes) y EC2 (API).

---

## 📋 Pre-requisitos

### 1. **AWS Account**
- Crear en https://aws.amazon.com
- Tener acceso a IAM, EC2, RDS, S3
- Asegurar saldo disponible (aprox. $3-5 USD/mes para tier free)

### 2. **AWS CLI**
```bash
# Instalar AWS CLI
pip install awscli

# O descargar desde: https://aws.amazon.com/cli/

# Configurar credenciales
aws configure
# Ingresar:
# - AWS Access Key ID: AKIAIOSFODNN7EXAMPLE
# - AWS Secret Access Key: wJalrXUt...
# - Default region: us-east-1
# - Default output format: json
```

### 3. **Verificar instalación**
```bash
aws sts get-caller-identity
# Debe mostrar: Account ID, User ARN, etc.
```

---

## 🚀 DEPLOYMENT (Paso a Paso)

### Opción A: AWS Lambda + API Gateway
1. Instala AWS SAM CLI: https://aws.amazon.com/serverless/sam/
2. Asegúrate de tener `aws configure` con credenciales válidas.
3. En el directorio `Backend`, ejecuta:
   ```bash
   chmod +x deploy_lambda.sh
   ./deploy_lambda.sh
   ```
4. Completa los valores de los parámetros en el despliegue:
   - `S3BucketName`
   - `DBHost`
   - `DBPort`
   - `DBUser`
   - `DBPassword`
   - `DBName`
   - `StageName`

### Qué cubre este despliegue
- `sam build` empaqueta el código Python y las dependencias
- `sam deploy --guided` crea la pila CloudFormation
- SAM genera el API Gateway y publica un endpoint público
- La salida del deploy incluye `ApiUrl` con la URL base de tu API

### Ejemplo de endpoint final
```text
https://<id>.execute-api.<region>.amazonaws.com/Prod/
```

### Qué se debe revisar después
- `ApiUrl` en la salida de SAM
- El endpoint `GET /health`
- El endpoint `POST /api/detect/upload-and-detect`

> Si tu RDS está en una VPC privada, recuerda configurar `VpcConfig` en `Backend/template.yaml`.

---

### Paso 1: Configurar Recursos AWS
```bash
cd Backend/scripts

# Hacer scripts ejecutables
chmod +x setup-aws-resources.sh
chmod +x setup-ec2.sh
chmod +x verify-deployment.sh

# Ejecutar script de setup
./setup-aws-resources.sh

# Ingresa tu IP pública (para SSH)
# Puedes obtenerla en: https://www.whatismyipaddress.com/
```

**Lo que hace:**
- ✅ Crea S3 Bucket para imágenes
- ✅ Crea RDS PostgreSQL (demora 5-10 minutos)
- ✅ Crea Usuario IAM con credenciales
- ✅ Configura Security Groups
- ✅ Genera archivo `aws-deployment-config.env`

**Espera ~10 minutos a que RDS esté lista.** Puedes verificar en AWS Console:
```
RDS → Instances → tic2-db (Estado debe ser: available)
```

---

### Paso 2: Lanzar Instancia EC2
```bash
# Una vez RDS esté "available"
./setup-ec2.sh

# Esto crea Key Pair (tic2-key.pem) y lanza EC2
```

**Lo que hace:**
- ✅ Crea Key Pair SSH
- ✅ Lanza instancia EC2 (t3.micro)
- ✅ Configura Security Groups
- ✅ Configura IAM Role para EC2
- ✅ Guarda metadata

**Anotá los valores mostrados:**
- Instance ID
- Public IP
- Key Name (tic2-key.pem)

---

### Paso 3: Conectar a EC2 y Configurar

#### Paso 3A: SSH a la instancia
```bash
# Asumiendo estás en Backend/scripts

# Conectar
ssh -i tic2-key.pem ec2-user@<PUBLIC_IP>

# Ejemplo:
ssh -i tic2-key.pem ec2-user@54.123.45.67
```

#### Paso 3B: Actualizar .env de la aplicación

Una vez dentro de EC2:
```bash
cd /app/tic2/Backend

# Editar .env
nano .env

# Cambiar estos valores (obtener de aws-deployment-config.env):
AWS_ACCESS_KEY_ID=tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key
S3_BUCKET=tic2-bucket-xxx
DB_HOST=tic2-db.xxxxx.us-east-1.rds.amazonaws.com  # IMPORTANTE!
DB_PASSWORD=tu_password

# Guardar: Ctrl+O, Enter, Ctrl+X
```

#### Paso 3C: Obtener RDS Endpoint

En otra terminal (tu máquina local):
```bash
aws rds describe-db-instances --db-instance-identifier tic2-db \
  --query 'DBInstances[0].Endpoint.Address' --output text
```

Copiar el resultado (ej: `tic2-db.xxxxx.us-east-1.rds.amazonaws.com`) y pegarlo en `DB_HOST` del .env de EC2.

#### Paso 3D: Restartear la aplicación

En EC2:
```bash
sudo systemctl restart tic2-api
sudo systemctl restart nginx

# Verificar status
sudo systemctl status tic2-api
sudo systemctl status nginx

# Ver logs
tail -f /var/log/tic2/error.log
```

---

### Paso 4: Verificar Deployment

#### Desde tu máquina local:
```bash
# Health check
curl http://<PUBLIC_IP>/health

# Respuesta esperada:
# {"status":"ok","service":"TIC2 API","version":"1.0.0"}

# Ver API docs (en navegador)
# http://<PUBLIC_IP>/docs

# Crear una ROI
curl -X POST http://<PUBLIC_IP>/api/rois/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Plaza Test",
    "description": "normal",
    "coordinates": [[100, 100], [200, 100], [200, 200], [100, 200]]
  }'
```

#### O usar script de verificación:
```bash
cd Backend/scripts
source ../aws-deployment-config.env
./verify-deployment.sh
```

---

## 🔗 URLS Y ENDPOINTS

Una vez deployado:

| Servicio | URL |
|----------|-----|
| **API Health** | `http://<PUBLIC_IP>/health` |
| **Swagger UI** | `http://<PUBLIC_IP>/docs` |
| **ReDoc** | `http://<PUBLIC_IP>/redoc` |
| **Detect** | `POST http://<PUBLIC_IP>/api/detect/upload-and-detect` |
| **ROIs** | `GET http://<PUBLIC_IP>/api/rois/list` |
| **Status** | `GET http://<PUBLIC_IP>/api/status` |

---

## 💾 ARCHIVOS IMPORTANTES

Después del deployment, guardar en lugar **SEGURO**:

```
aws-deployment-config.env     # Todas las credenciales
tic2-key.pem                   # Key para SSH
.env (local)                   # Variables de configuración
```

**NUNCA** compartir estos archivos o subirlos a GitHub.

---

## 🔐 SEGURIDAD EN PRODUCCIÓN

### 1. **HTTPS (SSL/TLS)**
```bash
# En EC2, instalar Let's Encrypt
sudo yum install -y certbot python3-certbot-nginx

# Generar certificado
sudo certbot --nginx -d tu-dominio.com

# Auto-renueva automáticamente
```

### 2. **RDS Security**
- [ ] Cambiar contraseña default de RDS
- [ ] Habilitar encryption at rest
- [ ] Habilitar automated backups
- [ ] Restore en instance privada (no público acceso)

### 3. **S3 Security**
- [ ] Bloquear public access
- [ ] Habilitar versioning
- [ ] Configurar lifecycle policies para old files

### 4. **EC2 Security**
- [ ] Usar Security Groups restrictivos
- [ ] Deshabilitar SSH a todo el mundo (solo tu IP)
- [ ] Usar IAM Roles en lugar de credenciales hardcodeadas
- [ ] Instalar y actualizar patches regulamente

---

## 📊 MONITOREO

### CloudWatch Logs
```bash
# Ver logs en tiempo real
aws logs tail /aws/ec2/tic2-api --follow

# O en EC2:
tail -f /var/log/tic2/error.log
```

### CloudWatch Metrics
En AWS Console:
```
CloudWatch → Dashboards → Create Dashboard
→ Add metrics para:
  - EC2 CPU
  - RDS Connections
  - S3 Bytes
```

---

## 🐛 TROUBLESHOOTING

| Problema | Solución |
|----------|----------|
| **Cannot connect to EC2** | Verificar Security Group puerto 22, tu IP está whitelisted |
| **API retorna 500** | Ver logs: `tail -f /var/log/tic2/error.log` |
| **DB connection refused** | RDS aún no está listo, esperar, o verificar endpoint en .env |
| **S3 upload fails** | Verificar IAM credenciales y que bucket existe |
| **Port 8000 already in use** | `sudo lsof -i :8000` y matar proceso |

---

## 💰 COSTOS AWS (Estimado/mes)

| Servicio | Tier | Costo |
|----------|------|-------|
| EC2 t3.micro | 12 meses free | $0 |
| RDS db.t3.micro | 12 meses free | $0 |
| S3 | 5GB free | $0 |
| **TOTAL** | | **~$0-5 USD** |

⚠️ Después del período free (12 meses), esperar:
- EC2: ~$8/mes
- RDS: ~$10/mes
- S3: ~$1/mes

---

## 🎯 SCALE UP (cuando necesites más)

### EC2
Cambiar instance type en `setup-ec2.sh`:
```bash
INSTANCE_TYPE="t3.small"  # o t3.medium, t3.large, etc.
```

### RDS
Aumentar en AWS Console:
```
RDS → Databases → tic2-db → Modify
→ Instance class → Seleccionar más grande
```

### S3
Se escala automáticamente, sin cambios necesarios.

---

## 📝 CHECKLIST FINAL

- [ ] AWS CLI instalado y configurado
- [ ] `setup-aws-resources.sh` ejecutado exitosamente
- [ ] RDS en estado "available"
- [ ] `setup-ec2.sh` ejecutado exitosamente
- [ ] EC2 IP pública anotada
- [ ] SSH conectado a EC2
- [ ] .env actualizado con RDS endpoint
- [ ] API respondiendo en /health
- [ ] ROIs creadas exitosamente
- [ ] S3 recibiendo uploads
- [ ] Logs sin errores
- [ ] aws-deployment-config.env guardado en lugar seguro

---

## 🆘 ¿Necesitas ayuda?

1. **AWS Console Errors** → Ver CloudWatch Logs
2. **API Errors** → Ver `/var/log/tic2/error.log` en EC2
3. **Connection Issues** → Verificar Security Groups
4. **RDS Issues** → Esperar a que esté "available"

---

**¡Listo para production!** 🎉
