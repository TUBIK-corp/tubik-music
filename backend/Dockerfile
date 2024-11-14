# Use the official Python image from the Docker Hub
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container at /app
COPY requirements.txt .

# Install ffmpeg and any other dependencies
RUN apt-get update && \
    apt-get install -y ffmpeg

# Install required Python packages
RUN pip install --no-cache-dir -r requirements.txt

# Copy the current directory contents into the container at /app
COPY . .

# Specify the command to run on container start
CMD ["python", "app.py"]