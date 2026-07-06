# syntax=docker/dockerfile:1.7

FROM node:22-alpine

RUN --mount=type=cache,id=rezil-openapi-npm,target=/root/.npm \
    npm install -g @redocly/cli openapi2aspida
