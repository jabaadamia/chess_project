# Pull base image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set work directory
WORKDIR /code

# Install dependencies
COPY Pipfile Pipfile.lock /code/
RUN pip install pipenv && pipenv install --system --deploy --ignore-pipfile

# Install Git and other necessary utilities
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*


# Copy project
COPY . /code/