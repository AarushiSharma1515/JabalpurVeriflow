#!/bin/bash

# Get the current IP address (excluding localhost)
CURRENT_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

echo "Current IP Address: $CURRENT_IP"
echo "Updating config/api.js..."

# Update the SERVER_IP in config/api.js
sed -i '' "s/const SERVER_IP = \".*\";/const SERVER_IP = \"$CURRENT_IP\";/" config/api.js

echo "✓ Updated SERVER_IP to $CURRENT_IP"
echo "✓ You can now run 'npm start' to start the app"
