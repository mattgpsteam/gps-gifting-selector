# No build step and no dependencies: node:sqlite and node:http are in the runtime.
FROM node:24-alpine

WORKDIR /app
COPY package.json ./
COPY src ./src
COPY scripts ./scripts

# The SQLite file lives on a bind mount from the host's encrypted volume.
RUN mkdir -p /data && chown -R node:node /data
USER node

ENV NODE_ENV=production PORT=8080 DB_FILE=/data/responses.sqlite
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s \
  CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
