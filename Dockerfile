# Imagen del frontend de Transporte Klein para Railway.
# Dos etapas: Node arma el sitio (vite build) y nginx sirve los archivos que
# quedan en dist/. La imagen final no lleva Node ni node_modules.

# --- Etapa 1: build ---
FROM node:22-slim AS build
WORKDIR /app

# Vite copia VITE_API_URL dentro del JavaScript al momento del build: después
# no se puede cambiar sin volver a construir. Railway pasa las variables del
# servicio como argumentos de build sólo si están declaradas con ARG.
ARG VITE_API_URL
# Sin la variable, el sitio quedaría apuntando a http://localhost:3000 y
# fallaría recién en el navegador. Mejor que el build corte acá.
RUN test -n "$VITE_API_URL" || (echo "Falta VITE_API_URL (URL del backend)" && exit 1)

# Primero sólo las dependencias, así Docker reutiliza esta capa si no cambian.
COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.js ./
COPY src ./src
RUN npm run build

# --- Etapa 2: servidor estático ---
FROM nginx:1.27-alpine
# La imagen de nginx reemplaza ${PORT} en las plantillas al arrancar.
# Railway inyecta PORT; en local queda 80.
ENV PORT=80
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
