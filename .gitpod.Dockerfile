FROM gitpod/workspace-full

RUN sudo apt-get update \
  && sudo apt-get install -y \
    g++ gcc make python2.7 pkg-config libx11-dev libxkbfile-dev libsecret-1-dev python-is-python3 rsync \
  && sudo rm -rf /var/lib/apt/lists/*