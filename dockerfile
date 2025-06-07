# Pull base image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set work directory
WORKDIR /app

# Install dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Install Git and other necessary utilities
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*


# Copy project
COPY . /app/


CMD ["sh", "-c", "python manage.py migrate && python manage.py collectstatic --noinput && gunicorn chess_project.wsgi:application --bind 0.0.0.0:8080"]