# See here for image contents: https://github.com/microsoft/vscode-dev-containers/tree/v0.158.0/containers/typescript-node/.devcontainer/base.Dockerfile

# [Choice] Node.js version: 14, 12, 10
ARG VARIANT="14-buster"
FROM mcr.microsoft.com/devcontainers/typescript-node:${VARIANT}

# same package list from github1s/scripts/preinstall.sh
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends libx11-dev libxkbfile-dev libsecret-1-dev rsync

# copied from https://github.com/microsoft/vscode-oniguruma/blob/main/.devcontainer/Dockerfile
RUN mkdir -p /opt/dev \
    && cd /opt/dev \
    && git clone https://github.com/emscripten-core/emsdk.git \
    && cd /opt/dev/emsdk \
    && ./emsdk install 3.1.21 \
    && ./emsdk activate 3.1.21

ENV PATH="/opt/dev/emsdk:/opt/dev/emsdk/node/14.18.2_64bit/bin:/opt/dev/emsdk/upstream/emscripten:${PATH}"
