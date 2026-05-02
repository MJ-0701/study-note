# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine

COPY --from=build /app/dist /usr/share/nginx/html

# Default nginx config is usually fine for SPA if we add a simple redirect
# But for now, we use the default
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
