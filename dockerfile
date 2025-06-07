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

# During build
RUN python manage.py collectstatic --noinput

# Debug: check if staticfiles directory exists
RUN ls -la staticfiles/ 

# Show some files
RUN echo "STATIC_ROOT contents:" && find staticfiles/ -type f | head -10  



# Runtime command 
CMD ["sh", "-c", "python manage.py migrate && gunicorn chess_project.wsgi:application --bind 0.0.0.0:8080"]