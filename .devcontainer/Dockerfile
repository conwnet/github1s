# See here for image contents: https://github.com/microsoft/vscode-dev-containers/tree/v0.158.0/containers/typescript-node/.devcontainer/base.Dockerfile

# [Choice] Node.js version: 14, 12, 10
ARG VARIANT="14-buster"
FROM mcr.microsoft.com/vscode/devcontainers/typescript-node:0-${VARIANT}

# same package list from github1s/scripts/pre-install.sh
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends libx11-dev libxkbfile-dev libsecret-1-dev rsync

# copied from https://github.com/microsoft/vscode-oniguruma/blob/main/.devcontainer/Dockerfile
RUN mkdir -p /opt/dev \
    && cd /opt/dev \
    && git clone https://github.com/emscripten-core/emsdk.git \
    && cd /opt/dev/emsdk \
    && ./emsdk install 2.0.6 \
    && ./emsdk activate 2.0.6

ENV PATH="/opt/dev/emsdk:/opt/dev/emsdk/node/12.9.1_64bit/bin:/opt/dev/emsdk/upstream/emscripten:${PATH}"
