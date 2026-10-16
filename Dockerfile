FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend /app/backend
COPY etl /app/etl
COPY frontend /app/frontend
COPY datos /app/datos
ENV PYTHONPATH=/app/backend
ENV MONGO_URI=mongodb://mongo:27017
ENV MONGO_DB=datos
EXPOSE 8000
CMD ["sh", "-c", "python etl/cargar_datos.py && gunicorn config.wsgi:application --bind 0.0.0.0:8000 --chdir /app/backend"]
