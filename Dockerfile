#stage 1
FROM node:12 as node
WORKDIR /app
COPY . .

RUN npm install
RUN npm run build --prod

#stage 2
FROM nginx:alpine

## Copy our default nginx config
COPY nginx/default.conf /etc/nginx/conf.d/

COPY --from=node /app/dist/CentroEmpleoWeb /usr/share/nginx/html

COPY run.sh /run.sh
RUN chmod +x /run.sh

CMD ["/run.sh"]