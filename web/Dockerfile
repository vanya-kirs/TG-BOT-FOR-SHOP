FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && mkdir data && chown node:node data
COPY --chown=node:node server ./server
COPY --chown=node:node dist ./dist
USER node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4173 DATABASE_PATH=/app/data/accounts.sqlite
EXPOSE 4173
CMD ["sh", "-c", "npm run db:migrate && npm start"]
