# Backend deployment
This document describes the process to deploy our backend system in our Kubernetes Cluster.

### Table of Contents

- [0) Understanding our Kubernetes Architecture](#0-understanding-our-kubernetes-architecture)
- [1.0) Preparing Cluster to deploy MongoDB](#10-preparing-cluster-to-deploy-mongodb)
  - [1.1) Labeling nodes](#11-labeling-nodes)
  - [1.2) Dockerizing Mongo](#12-dockerizing-mongo)
  - [1.3) Dockerizing API (Backend)](#13-dockerizing-api-backend)
  - [1.4) Persistent Volumes](#14-persistent-volumes)
  - [1.5) ConfigMaps](#15-configmaps)
  - [1.6) Services](#16-services)
- [2.0) MongoDB Deployment](#20-mongodb-deployment)
- [3.0) API deployment](#30-api-deployment)
- [Improvements](#improvements)
- [Troubleshooting](#troubleshooting)
- [References](#references)


## 0) Understanding our Kubernetes Architecture
First, we need to understand how the nodes, pods and service are connected and communicate between them.
![Cluster](./img/architecture.jpg)

- **Nodes** (see [installation](./installation.md))

  1. `zubat` (Control Plane)
  2. `vileplume`
  3. `gloom`

- **Deployments**
  1. Web App
  2. MongoDB
  3. API

- **Services**

  | Name              | Exposes     | Type        | Port   |
  |-------------------|-------------|-------------|--------|
  | `webapp-service`  | WebApp      | `NodePort`  | 32333  |
  | `api-service`     | API         | `NodePort`  | 32334  |
  | `mongodb-service` | MongoDB     | `ClusterIP` | -      |

<br>

Summarizing, `NodePort` services expose the `API` and `webapp` deployments to internet to make them accessible, while `mongodb-service` permits communication between `API` and `MongoDB` (unreachable from internet).

## 1.0) Preparing Cluster to deploy MongoDB
In this section we will make the previous steps and configure the cluster before deploying our applications.

### 1.1) Labeling nodes
First, we need to decide if we let Kubernetes choose in which node will our pods be created, or we set a node for certain pods. In this case, we will make this assignment:
| Deployment  | Node        |
|-------------|-------------|
| Web App     | `Vileplume` |
| MongoDB     | `Vileplume` |  
| API         | `Gloom`     | 

To perform that, we need to label our nodes and select them in the **deployment manifests** with tag `nodeSelector`. We will see that later.

For labeling nodes we run:
```bash
kubectl label nodes <your-node-name> <tag>=<name>
```

We will label our nodes this way:
```bash
kubectl label nodes vileplume type=mogoer
kubectl label nodes gloom type=api
```

### 1.2) Dockerizing Mongo
Now we will prepare the images that our deployments will pull. We will use **DockerHub** to upload our images.

Here is the image building for MongoDB deployment. First check the needed files:

- [**init.js**](../manifests/mongodb/docker-image/init.js)
```js
db.createCollection("users");

db.createUser({
  user: "root",
  pwd: "elnano33!",
  roles: ["readWrite"]
});

db.users.insert({
  username: "josep",
  password: "eljefe",
  createdAt: new Date()
});
```

- [**mongo.conf** ](../manifests/mongodb/docker-image/mongo.conf)
```conf
storage:
  dbPath: /data/db

security:
  authorization: enabled

net:
  port: 27017
  bindIp: 0.0.0.0

```

- [**Dockerfile**](../manifests/mongodb/docker-image/Dockerfile)
```Dockerfile
FROM mongo:4.4

COPY mongo.conf /etc/mongo.conf
COPY init.js /docker-entrypoint-initdb.d/

CMD ["mongod", "--config", "/etc/mongo.conf"]
```
The `docker-entrypoint-initdb.d/` directory execute its content automatically when the container is created. Therefore, `init.js` will initialize the database as we want.

To build the image we run:
```bash
docker build -t <repo>/<name>:<tag> Dockerfile
```

To push our images to **DockerHub** we first need to log in and then push the image.
```bash
docker login --username <username> --password <password>
docker push <repo>/<name>:<tag>
```

### 1.3) Dockerizing API (Backend)
In the same way, we will create a Dockerfile to build an image for our backend:
- [**Dockerfile**](../manifests/)
```Dockerfile
FROM node:slim

ENV NODE_ENV development

WORKDIR /express-docker

COPY . .

RUN npm install

CMD [ "npm", "run", "start" ]

EXPOSE 8080
```
Briefly, we start from a `node` image and then we copy our project into a new directory called `/express-docker`. Then we install all necessary modules. Finally we start up the server and then expose our port.

Again, we build and upload our image to the registry:
```bash
docker build -t <repo>/<name>:<tag> Dockerfile
docker push <repo>/<name>:<tag>
```

### 1.4) Persistent Volumes
To guarantee that our data persists to pod replacing, we will set a persistent volume. Here are the manifests:
- [**mongodb-pv.yaml**](../manifests/mongodb/mongodb-pv.yaml)
```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: mongo-data
spec:
  accessModes:
    - ReadWriteOnce
  capacity:
    storage: 1Gi
  hostPath:
    path: /data/mongo
```
This manifest sets up a Persistence Volume in `/data/mongo` of the node where the pod will be running.

- [**mongodb-pvc.yaml**](../manifests/mongodb/mongodb-pvc.yaml)
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mongodb-pvc
spec:
  storageClassName: ""
  accessModes:
    - ReadWriteOnce 
  volumeName: mongo-data
  resources:
    requests:
      storage: 1Gi
```
And this creates a Persistence Volume Claim. A PVC is a request for storage data in a PV.

### 1.5) ConfigMaps
ConfigMaps are a Kubernetes mechanism that let you inject configuration data into application pods. We need to create one for **MongoDB** deployment to tell the pod from what path it has to store/read data.
```bash
kubectl create configmap create-db-configmap --from-file=./docker-image/init.js
```
By running this, we create a configmap with name `create-db-configmap` with configuration from `init.js`.


### 1.6) Services

## 2.0) MongoDB Deployment

## 3.0) API deployment

## Improvements
## Troubleshooting

## References 
- [Assign pods to nodes](https://kubernetes.io/docs/tasks/configure-pod-container/assign-pods-nodes/)
- [Miro App](https://miro.com)