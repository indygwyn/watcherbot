#!/bin/bash

export PATH=/usr/local/bin:$PATH
export NODE_PATH=/usr/local/lib/node_modules

cd /opt/watcherbot

forever start -o watcherbot.log -e watcherbot.err -a watcherbot.js

