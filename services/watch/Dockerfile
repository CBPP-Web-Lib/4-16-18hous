FROM node:16

WORKDIR /opt/project

RUN apt-get update 

RUN npm config set cache /home/node/cache --global
RUN npm install -g webpack@5
RUN npm install -g webpack-cli@5
RUN npm install -g gulp

RUN apt-get install gdal-bin -y

EXPOSE 3000
EXPOSE 9229

ENTRYPOINT npx webpack