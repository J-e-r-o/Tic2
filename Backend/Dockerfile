# Dockerfile para Lambda con container (python:3.11-slim + awslambdaric)
FROM python:3.11-slim

# Dependencias del sistema para OpenCV
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Instalar torch CPU-only primero (evita descargar CUDA ~2GB)
RUN pip install --no-cache-dir --timeout=300 torch==2.1.0 torchvision==0.16.0 --index-url https://download.pytorch.org/whl/cpu

# Copiar requirements e instalar resto de dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir --timeout=300 -r requirements.txt
RUN pip install --no-cache-dir awslambdaric

# Copiar código
COPY . .

# Lambda handler via awslambdaric
ENTRYPOINT ["/usr/local/bin/python", "-m", "awslambdaric"]
CMD ["main.handler"]
