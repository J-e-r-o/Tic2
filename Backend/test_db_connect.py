"""
Script sencillo para probar conexión a RDS Postgres con SSL.

Uso: ejecutar desde la carpeta Backend con Python 3.
"""
import os
import sys

try:
    import psycopg2
except Exception as e:
    print("PSYCOPG2_IMPORT_ERROR", e)
    sys.exit(2)

PW = os.environ.get('TEST_PW', '7kgzn4khE8sWsq7')
HOST = 'mi-postgres.cxk6eu6w4zlv.us-east-2.rds.amazonaws.com'
PORT = 5432
USER = 'postgres'
DB = 'ticdb'

try:
    conn = psycopg2.connect(
        host=HOST,
        port=PORT,
        user=USER,
        password=PW,
        database=DB,
        sslmode='require',
        connect_timeout=10
    )
    print('CONNECTION_OK')
    conn.close()
except Exception as e:
    print('CONNECTION_ERROR', e)
    sys.exit(3)
