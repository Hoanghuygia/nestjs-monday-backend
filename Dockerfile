FROM node:22-slim AS base

ENV DIR /app
WORKDIR $DIR
ARG NPM_TOKEN

FROM base AS dev

ENV NODE_ENV=development
ENV CI=true

RUN apt update && apt install -y curl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY patches patches

# Install dependencies without running postinstall scripts first
RUN npm install --ignore-scripts && \
    # Then run the postinstall scripts
    npm rebuild || true

COPY tsconfig*.json .
COPY .swcrc .
COPY nest-cli.json .
COPY .mappsrc .
COPY fetch-schema.sh .
COPY src src

EXPOSE 8080
CMD ["npm", "run", "dev:server"]

FROM base AS build

ENV CI=true

RUN apt-get update \
    && apt-get install -y --no-install-recommends dumb-init \
    && rm -rf /var/lib/apt/lists/*


COPY package.json package-lock.json ./
RUN echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > ".npmrc" && \
    npm ci && \
    rm -f .npmrc

COPY tsconfig*.json .
COPY .swcrc .
COPY nest-cli.json .
COPY .mappsrc .
COPY src src

RUN node --run build && \
    npm prune --production

FROM base AS production

ENV NODE_ENV=production
ENV USER=node

COPY --from=build /usr/bin/dumb-init /usr/bin/dumb-init
COPY --from=build $DIR/package.json .
COPY --from=build $DIR/package-lock.json .
COPY --from=build $DIR/node_modules node_modules
COPY --from=build $DIR/dist dist

USER $USER
EXPOSE $PORT
CMD ["dumb-init", "node", "dist/main.js"]
