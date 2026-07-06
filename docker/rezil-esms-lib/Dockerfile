# syntax=docker/dockerfile:1.7

FROM sbtscala/scala-sbt:eclipse-temurin-21.0.8_9_1.11.7_3.3.7

ARG DEPLOY_ENV=
ARG REZIL_LIB_VERSION=

ENV DEPLOY_ENV=${DEPLOY_ENV}

WORKDIR /workspace/rezil-esms-lib

COPY . .

RUN --mount=type=cache,id=rezil-esms-lib-coursier,target=/root/.cache/coursier \
    --mount=type=cache,id=rezil-esms-lib-ivy-cache,target=/root/.ivy2/cache \
    --mount=type=cache,id=rezil-esms-lib-sbt,target=/root/.sbt \
    if [ -n "$REZIL_LIB_VERSION" ]; then \
      sbt "set ThisBuild / version := \"$REZIL_LIB_VERSION\"" publishLocal; \
    else \
      sbt publishLocal; \
    fi
