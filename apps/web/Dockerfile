ARG NODE_IMAGE=node:24.20.0-alpine
ARG NGINX_IMAGE=nginx:1.29.4-alpine
FROM ${NODE_IMAGE} AS build
ARG NPM_REGISTRY=https://registry.npmjs.org
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@11.21.0 --activate && pnpm config set registry "$NPM_REGISTRY"
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/web apps/web
COPY packages/api-client packages/api-client
RUN --mount=type=cache,id=pnpm-store-web,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN test -n "$VITE_API_BASE_URL" && pnpm --filter @baby-growth-gallery/web build

FROM ${NGINX_IMAGE} AS runtime
COPY infra/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
