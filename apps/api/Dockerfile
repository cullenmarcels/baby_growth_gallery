ARG NODE_IMAGE=node:24.20.0-alpine
FROM ${NODE_IMAGE} AS build
ARG NPM_REGISTRY=https://registry.npmjs.org
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@11.21.0 --activate && pnpm config set registry "$NPM_REGISTRY"
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/api apps/api
RUN --mount=type=cache,id=pnpm-store-api,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter @baby-growth-gallery/api build
RUN --mount=type=cache,id=pnpm-store-api,target=/root/.local/share/pnpm/store pnpm --filter @baby-growth-gallery/api deploy --legacy --prod --ignore-scripts /out

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /out ./
USER app
EXPOSE 3000
CMD ["node", "dist/main.js"]
