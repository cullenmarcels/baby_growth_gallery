FROM node:24.20.0-alpine AS build
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@11.21.0 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile --filter @baby-growth-gallery/api...
COPY apps/api apps/api
RUN pnpm --filter @baby-growth-gallery/api build
RUN pnpm deploy --filter @baby-growth-gallery/api --prod /out

FROM node:24.20.0-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /out ./
COPY --from=build --chown=app:app /workspace/apps/api/dist ./dist
USER app
EXPOSE 3000
CMD ["node", "dist/main.js"]
