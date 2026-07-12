FROM node:22-alpine AS build

WORKDIR /app

ARG VITE_API_BASE_URL=http://localhost:8000
ARG VITE_AUTH0_DOMAIN
ARG VITE_AUTH0_CLIENT_ID
ARG VITE_AUTH0_AUDIENCE
ARG VITE_AUTH0_ROLE_NAMESPACE=https://stateful-agent.com
ARG VITE_AUTH0_SCOPE="openid profile email ask:support_query read:tickets read:incidents trigger:escalation view:evaluation"
ARG VITE_ENABLE_DEBUG_LOGS=false

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_AUTH0_DOMAIN=$VITE_AUTH0_DOMAIN \
    VITE_AUTH0_CLIENT_ID=$VITE_AUTH0_CLIENT_ID \
    VITE_AUTH0_AUDIENCE=$VITE_AUTH0_AUDIENCE \
    VITE_AUTH0_ROLE_NAMESPACE=$VITE_AUTH0_ROLE_NAMESPACE \
    VITE_AUTH0_SCOPE=$VITE_AUTH0_SCOPE \
    VITE_ENABLE_DEBUG_LOGS=$VITE_ENABLE_DEBUG_LOGS

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
