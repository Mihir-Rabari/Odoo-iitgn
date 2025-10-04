# Frontend Dockerfile for Expe (React + Vite)
# 1) Build stage
FROM node:18-alpine AS build
WORKDIR /app

# Install dependencies first
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build with configurable API URL (defaults to /api for Nginx proxy)
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# 2) Nginx stage to serve static files
FROM nginx:alpine AS runtime
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
