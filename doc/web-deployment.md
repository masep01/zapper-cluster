# Zapper Landing Page - Deployment
### Table of contents
- [Dockerization of NextJS Application](#1-dockerization-of-nextjs-application)
- [Docker Registry](#2-docker-registry)
- [Application Deployment](#3-application-deployment)
    - [Deployment](#31-deployment)
    - [Service](#32-service)
    - [Apply Changes](#33-apply-changes)
- [Testing](#4-testing)
    - [Deleting Pods](#41-deleting-pods)
- [References](#references)


## 1) Dockerization of NextJS Application
The first step is to Dockerize and generate the NextJs image.

**Dockerfile**
```Dockerfile
FROM node:18

WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3000
CMD ["npm", "run", "dev"]
```
(see original file in [zapper-web](https://github.com/masep01/zapper-web))

We also can create a `.dockerignore` file to specify which file Docker has to ignore in the building process:
```docker
.git
.gitattributes
.gitignore
node_modules
README.md
```

We run `docker build -t <tag> .` to create an image with name `<tag>`.

## 2) Docker Registry
Now we need to upload our image to a repository and make it accessible from our Kubernetes Cluster. We need:
- An account in a Docker Registry like [DockerHub](https://hub.docker.com/).
- A repository in that Registry

To push our builded image:
```docker
docker push <repo>/<image:tag>
```

<br>

The next step is to generate a secret to permit Kubernetes deployments to pull images from our repository.
```bash
kubectl create secret docker-registry <secret-name> --docker-server=<your-registry-server> --docker-username=<your-name> --docker-password=<your-pword> --docker-email=<your-email>
```
Where:     
- `<your-registry-server`> is your Private Docker Registry FQDN. Use https://index.docker.io/v1/ for DockerHub.
- `<your-name>` is your Docker username.
- `<your-pword>` is your Docker password.
- `<your-email>` is your Docker email.

<br>

Now we have generated a secret able to pull images from our repository with name `<secret-name>`.

## 3) Application Deployment
### 3.1) Deployment 
Once our image is ready to be pulled and our cluster is initially configured (see [Installation](./installation.md)), we can deploy our web application.

That manifest will create two pods with of our application.

**nextjs_deployment.yaml**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp-deployment
spec:
  replicas: 2
  selector:
    matchLabels:
      app: zapper-webapp
  template:
    metadata:
      labels:
        app: zapper-webapp
    spec:
      containers:
      - name: webapp-container
        image: masep01/zapper-web:latest
        ports:
        - containerPort: 3000
      imagePullSecrets:
      - name: registry-secret
```
### 3.2) Service
Now we need a Service to expose our application. We will choose `NodePort`.

`NodePort` will expose our pods through a specified port. The pods will be accessible via any IP of the cluster and the specified port.

We can define the `nodePort` and set a static value or let Kubernetes decide for us and it will choose one from this range [30000-32767].

**nodeport_service.yaml**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: nodeport-service
spec:
  type: NodePort
  selector:
    app: zapper-webapp
  ports:
    - protocol: TCP
      port: 3000
      targetPort: 3000
      nodePort: 32333
```

We can see that our application will be accessible from any IP of the cluster nodes and the port `32333`.

**[!] Disclaimer**: now `nodeport_service.yaml` is renamed to `webapp-service`-

### 3.3) Apply changes
We can now apply the changes by running:
```bash
kubectl apply -f .
```
It will apply or create any changes based on the manifests stored in the current directory `.`.

## 4) Testing
We can access our web application via any cluster nodes IP and `NodePort` will route traffic to the pods:
- **node-master:** http://10.4.41.57:32333/
- **worker:** http://10.4.41.60:32333/
- **worker:** http://10.4.41.61:32333/

Alternatively, we could use hostnames:
- **node-master:** http://zubat.fib.upc.edu:32333/
- **worker:** http://gloom.fib.upc.edu:32333/
- **worker:** http://vileplume.fib.upc.edu:32333/


### 4.1) Deleting pods
We can try to delete a pod and Kubernetes will automatically create another one to replace it until the number of `replicas` is satisfied.

We can test it by getting the pods names with:
```bash
kubectl get pods [-o wide]
```

And delete a pod with name `<pod-name>`:
```bash
kubectl delete pods <pod-name>
```

If we run again `kubectl get pods` we will notice that Kubernetes will create another pod for us automatically.

## References
[Pull an Image from a Private Registry](https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/)  
[Services - NodePort](https://kubernetes.io/docs/concepts/services-networking/service/#type-nodeport)