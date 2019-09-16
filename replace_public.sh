#!/bin/bash -eu

SCRIPT_DIR=$(cd $(dirname $0); pwd)
PUBLIC_DIR=${SCRIPT_DIR}/public

cd ${PUBLIC_DIR}
rm -rf ${PUBLIC_DIR}/*
mv /home/ise/src.zip ${PUBLIC_DIR}
unzip ${PUBLIC_DIR}/src.zip
rm ${PUBLIC_DIR}/src.zip
