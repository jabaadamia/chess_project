# Pull base image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set work directory
WORKDIR /code

# Install dependencies
COPY requirements.txt /code/
RUN pip install --no-cache-dir -r requirements.txt

# Install Git and other necessary utilities
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*


# Copy project
COPY . /code/

# Collect static files
RUN python manage.py collectstatic --noinput

# Use Gunicorn for production
CMD ["sh", "-c", "python manage.py collectstatic --noinput && gunicorn chess_project.wsgi:application --bind 0.0.0.0:8080"]