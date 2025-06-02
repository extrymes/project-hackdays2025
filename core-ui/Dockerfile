FROM registry.gitlab.open-xchange.com/frontend/dev_env/node_builder:latest AS builder

WORKDIR /app
COPY . /app
RUN yarn --non-interactive --frozen-lockfile --no-progress -s

ARG APP_VERSION
ARG BUILD_TIMESTAMP
ARG CI_COMMIT_SHA

RUN yarn build

RUN echo "add_header version \"$CI_COMMIT_SHA\";" >> headers.conf

FROM registry.gitlab.open-xchange.com/frontend/dev_env/distroless/nginx:latest
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/headers.conf /etc/nginx/conf.d/headers.conf
