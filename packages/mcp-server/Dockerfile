FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /monorepo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json turbo.json ./
COPY packages/ packages/
RUN pnpm install --frozen-lockfile
RUN pnpm turbo build --filter=@easyink/mcp-server
RUN pnpm deploy --legacy --filter=@easyink/mcp-server /deploy

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /deploy .
ENV MCP_TRANSPORT=http
ENV MCP_HTTP_PORT=3000
EXPOSE 3000
CMD ["node", "dist/bin/server.mjs"]
