#!/bin/bash

# Get script directory and repository root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Create directory for PyPi package
echo "Creating temporary directory for PyPi package..."
mkdir -p /tmp/pypi_libs
cd /tmp/pypi_libs || { echo "Failed to cd to /tmp/pypi_libs"; exit 1; }

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is required for this script."
    exit 1
fi

# Create a Dockerfile in the temporary directory
cat > Dockerfile << 'EOF'
FROM python:3.9-slim

WORKDIR /opt/build
RUN apt-get update && apt-get install -y zip unzip build-essential

# Create directory structure
RUN mkdir -p /tmp/unpacked

# Install lasio without dependencies, then manually install required dependencies except numpy
RUN pip install --no-deps lasio --target=/tmp/unpacked 
    # && \
    # pip install --no-deps pandas --target=/tmp/unpacked && \
    # pip install --no-deps python-dateutil --target=/tmp/unpacked && \
    # pip install --no-deps pytz --target=/tmp/unpacked && \
    # pip install --no-deps six --target=/tmp/unpacked

# Zip the package
RUN cd /tmp/unpacked && \
    zip -r9 /opt/build/pypi_libs.zip .

EOF

# Build the Docker image
echo "Building Docker image..."
docker build --platform linux/amd64 -t pypi_libs_packager . || { echo "Failed to build Docker image"; exit 1; }
 
# Run the Docker container and copy out the zip file
echo "Extracting pypi_libs.zip from container..."
docker run --rm --name pypi_libs_packager-container -d pypi_libs_packager tail -f /dev/null
docker cp pypi_libs_packager-container:/opt/build/pypi_libs.zip ./pypi_libs.zip || { echo "Failed to copy pypi_libs.zip from container"; docker stop pypi_libs_packager-container; exit 1; }
docker stop pypi_libs_packager-container

# Check if the zip file was created
if [ -f "pypi_libs.zip" ]; then
    echo "fsspec library has been packaged into /tmp/pypi_libs/pypi_libs.zip"
else
    echo "Error: Failed to generate pypi_libs.zip"
    exit 1
fi

# Get the bucket name from amplify_outputs.json
echo "Reading bucket name from amplify_outputs.json..."
if [ ! -f "$REPO_ROOT/amplify_outputs.json" ]; then
    echo "Error: amplify_outputs.json not found"
    exit 1
fi

BUCKET_NAME=$(grep -o '"bucket_name": "[^"]*"' "$REPO_ROOT/amplify_outputs.json" | head -1 | cut -d'"' -f4)

if [ -z "$BUCKET_NAME" ]; then
    echo "Error: Could not find bucket_name in amplify_outputs.json"
    exit 1
fi

# Upload to S3
echo "Uploading pypi_libs.zip to s3://$BUCKET_NAME/pypi/"
aws s3 cp pypi_libs.zip "s3://$BUCKET_NAME/pypi/" || { echo "Failed to upload to S3"; exit 1; }

echo "Successfully uploaded pypi_libs.zip to s3://$BUCKET_NAME/pypi/"
