#!/bin/bash

# Script to update ML API URL in projectsService.js
# Usage: ./update-ml-api-url.sh <ngrok-url>
# Example: ./update-ml-api-url.sh https://abc123.ngrok-free.app

if [ -z "$1" ]; then
    echo "Error: No Ngrok URL provided"
    echo "Usage: ./update-ml-api-url.sh <ngrok-url>"
    echo "Example: ./update-ml-api-url.sh https://abc123.ngrok-free.app"
    exit 1
fi

NGROK_URL="$1"
FILE1="services/projectsService.js"
FILE2="services/carbonService.js"

# Remove trailing slash if present
NGROK_URL="${NGROK_URL%/}"

# Check if files exist
if [ ! -f "$FILE1" ]; then
    echo "Error: $FILE1 not found"
    exit 1
fi

if [ ! -f "$FILE2" ]; then
    echo "Warning: $FILE2 not found, skipping"
fi

# Update the ML_API_BASE constant in projectsService.js
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|const ML_API_BASE = .*|const ML_API_BASE = \"$NGROK_URL\";|" "$FILE1"
    if [ -f "$FILE2" ]; then
        sed -i '' "s|const BASE_URL = .*|const BASE_URL = \"$NGROK_URL\";|" "$FILE2"
    fi
else
    # Linux
    sed -i "s|const ML_API_BASE = .*|const ML_API_BASE = \"$NGROK_URL\";|" "$FILE1"
    if [ -f "$FILE2" ]; then
        sed -i "s|const BASE_URL = .*|const BASE_URL = \"$NGROK_URL\";|" "$FILE2"
    fi
fi

echo "✅ ML API URL updated successfully!"
echo "Updated $FILE1 with: $NGROK_URL"
if [ -f "$FILE2" ]; then
    echo "Updated $FILE2 with: $NGROK_URL"
fi
echo ""
echo "Next steps:"
echo "1. Make sure ML API server is running: python api_server.py"
echo "2. Restart your mobile app: npm start"
echo "3. Test the verification flow"
