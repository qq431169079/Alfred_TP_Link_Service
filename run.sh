#!/bin/bash
clear

echo "The following node processes were found and will be killed:"
export PORT=3978
lsof -i :$PORT
kill -9 $(lsof -sTCP:LISTEN -i:$PORT -t)

echo "Removing node modules folder and installing latest"
rm -rf node_modules
rm package-lock.json
ncu -u
npm install
npm audit fix
snyk test

echo "Set env vars"
export ENVIRONMENT="development"
export MOCK="false"
export ALFRED_WEATHER_SERVICE="https://alfred_weather_service:3979"

echo "Run the server"
npm run local
