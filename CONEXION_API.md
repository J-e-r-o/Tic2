# 🔗 Conexión Frontend-Backend - TIC2

## ✅ Conexión Completada

Se ha establecido exitosamente la conexión entre el frontend (React/Vite) y el backend (FastAPI/Python).

### 📦 Instalaciones
- **axios**: Cliente HTTP para peticiones entre frontend y backend

### 🏗️ Estructura de Servicios API Creada

Se creó una carpeta `src/api/` con servicios modulares:

- **[config.js](src/api/config.js)** - Configuración base URL
- **[client.js](src/api/client.js)** - Cliente HTTP con interceptores
- **[auth.js](src/api/auth.js)** - Servicios de autenticación
- **[detect.js](src/api/detect.js)** - Servicios de detección de plazas
- **[rois.js](src/api/rois.js)** - Servicios de ROIs (regiones de interés)

### 🔐 Autenticación

#### Login Page → Backend
- Conectado con `POST /api/auth/login`
- Guarda `token`, `rol` y `username` en localStorage
- Manejo de errores: contraseñas incorrectas, datos inválidos, conexión

#### Interceptor de Token
- Todos los endpoints automáticamente incluyen el token Bearer
- Si el token expira (401), redirige al login

### 📊 Dashboards Conectados

#### User Dashboard
- Obtiene la última detección del backend
- Se actualiza automáticamente cada 30 segundos
- Muestra: plazas libres/ocupadas, imagen de S3, timestamp

#### Admin Dashboard
- Carga datos de detecciones
- Permite subir fotos para procesar
- Muestra estado de la Pi (heartbeat)
- Botón para descargar historial

#### Historial (History Page)
- Obtiene historial completo de detecciones
- Soporte para filtros:
  - Rango de plazas libres/ocupadas
  - Rango de horas
  - Por día, mes, año
- Visualiza fotos desde S3

### ⚙️ Variables de Entorno

**[.env](.env)** - Configuración local
```env
VITE_API_URL=http://localhost:8000
```

**[.env.example](.env.example)** - Template para otros entornos
```env
VITE_API_URL=http://localhost:8000
```

### 🚀 Cómo Usar

#### Desarrollo Local

1. **Backend corriendo**:
   ```bash
   cd Backend
   python main.py
   # Puerto: 8000
   ```

2. **Frontend corriendo**:
   ```bash
   cd Frontend
   npm install
   npm run dev
   # Puerto: 5173
   ```

3. **Prueba de Login**:
   - La URL del backend se muestra en el formulario de login
   - Si el backend no está disponible, verás error de conexión

#### Cambiar URL del Backend

Si el backend está en otro servidor (ej: EC2):

```env
VITE_API_URL=https://tu-dominio.com
```

### 📝 Endpoints Utilizados

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/login` | Autenticación |
| POST | `/api/detect/upload-and-detect` | Detectar plazas desde imagen |
| GET | `/api/detect/history` | Historial de detecciones |
| GET | `/api/rois/list` | Lista de ROIs |
| POST | `/api/rois/create` | Crear nueva ROI |

### 🔍 Detalles Técnicos

**Interceptores en client.js:**
- ✅ Agrega token automáticamente a todos los requests
- ✅ Maneja errores de autenticación (401)
- ✅ Soporte para multipart/form-data (upload de imágenes)

**Manejo de Errores:**
- Mensajes de error específicos por código HTTP
- Logging en consola para debugging
- Fallback a mensaje genérico

**CORS:**
- Backend permite `*` (en producción especificar)
- Frontend se conecta sin problemas

### 🎯 Próximos Pasos (Opcionales)

1. Implementar refreshing automático de datos
2. Agregar más filtros al historial
3. Agregar notificaciones en tiempo real
4. Integración con Socket.io para actualizaciones en vivo
5. Tests de los servicios API

---

**Estado**: ✅ Listo para usar
**Ultima actualización**: 19/05/2026
