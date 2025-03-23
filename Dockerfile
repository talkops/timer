FROM node:23.9-slim AS base
ENV NODE_NO_WARNINGS=1
RUN mkdir /app && mkdir /data && chown node:node /app && chown node:node /data
WORKDIR /app

FROM base AS dev
ENV NODE_ENV=development
RUN npm install -g pm2
COPY . .
RUN chown -R node:node /app
USER node
RUN npm install
VOLUME [ "/app" ]
CMD ["pm2-runtime", "ecosystem.config.cjs" ]

FROM base
ENV NODE_ENV=production
COPY index.mjs package.json ./
RUN npm install --omit=dev
COPY schemas schemas
COPY db.js ./
USER node
CMD ["node", "index.mjs" ]
