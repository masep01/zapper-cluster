FROM mongo:4.4

COPY mongo.conf /etc/mongo.conf
COPY init.js /docker-entrypoint-initdb.d/

CMD ["mongod", "--config", "/etc/mongo.conf"]
