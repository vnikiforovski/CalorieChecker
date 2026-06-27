# Installing NGINX Ingress Controller on DigitalOcean Kubernetes

## Why do we need an Ingress Controller?

A Kubernetes Ingress resource (like our `ingress.yaml`) is just a **configuration file** — it describes routing rules but does nothing by itself. You need an **Ingress Controller** to actually implement those rules.

The **nginx-ingress-controller**:
1. Runs as a pod inside your cluster
2. Watches all Ingress resources across all namespaces
3. Translates the Ingress rules into an Nginx configuration
4. Reloads Nginx whenever the rules change
5. Creates a **DigitalOcean Load Balancer** (external IP) automatically

Without it, the `ingress.yaml` file is applied but completely ignored — no traffic routing happens.

---

## Step 1: Add the Helm repository

[Helm](https://helm.sh/) is the package manager for Kubernetes. We use it to install nginx-ingress because it handles all the required sub-resources (Deployments, Services, ClusterRoles, etc.) in one command.

```bash
# Add the official ingress-nginx Helm chart repository
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx

# Download the latest chart information from the repository
helm repo update
```

> **What is a Helm chart?**
> A Helm chart is a package of pre-configured Kubernetes manifests. Instead of writing 15+ YAML files to install nginx-ingress, you run one Helm command.

---

## Step 2: Install the nginx-ingress-controller

```bash
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/do-loadbalancer-name"="caloriechecker-lb" \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/do-loadbalancer-size-slug"="lb-small" \
  --set controller.replicaCount=2 \
  --set controller.resources.requests.cpu=100m \
  --set controller.resources.requests.memory=128Mi \
  --set controller.resources.limits.cpu=500m \
  --set controller.resources.limits.memory=512Mi
```

**Breaking down each flag:**

| Flag | What it does |
|------|--------------|
| `helm install ingress-nginx` | The name for this Helm release (can be anything) |
| `ingress-nginx/ingress-nginx` | `<repo-name>/<chart-name>` from Step 1 |
| `--namespace ingress-nginx` | Install into the `ingress-nginx` namespace |
| `--create-namespace` | Create the namespace if it doesn't exist |
| `controller.service.type=LoadBalancer` | Creates a DigitalOcean Load Balancer (external IP) |
| `do-loadbalancer-name` | Names the LB "caloriechecker-lb" in your DO dashboard |
| `do-loadbalancer-size-slug=lb-small` | Smallest (cheapest) LB tier on DigitalOcean (~$12/month) |
| `controller.replicaCount=2` | Run 2 nginx-ingress-controller pods for HA |
| `resources.*` | Resource requests/limits for the controller pods |

> **Why a separate namespace (`ingress-nginx`)?**
> The ingress controller is infrastructure shared by the whole cluster, not part of our application. Keeping it in its own namespace follows the principle of separation of concerns and makes it easier to manage independently.

---

## Step 3: Verify the installation

```bash
# Check that the nginx-ingress pods are running
kubectl get pods -n ingress-nginx

# Expected output:
# NAME                                        READY   STATUS    RESTARTS   AGE
# ingress-nginx-controller-xxxxxxxxx-xxxxx    1/1     Running   0          2m
# ingress-nginx-controller-xxxxxxxxx-xxxxx    1/1     Running   0          2m
```

```bash
# Check that the LoadBalancer Service got an external IP
kubectl get svc -n ingress-nginx

# Expected output (wait 1-2 minutes for EXTERNAL-IP to appear):
# NAME                                 TYPE           CLUSTER-IP      EXTERNAL-IP       PORT(S)
# ingress-nginx-controller             LoadBalancer   10.245.x.x      143.198.xxx.xxx   80:30080/TCP,443:30443/TCP
#                                                                       ^^^^^^^^^^^
#                                                                       This is your public IP!
```

> **The EXTERNAL-IP shows `<pending>` for 1-2 minutes** — this is normal. DigitalOcean is provisioning the Load Balancer. Once it appears, your cluster has a public IP address.

---

## Step 4: Apply our application manifests

Now that the Ingress Controller is running, apply the CalorieChecker manifests in order:

```bash
# 1. Run database migrations first (Job must complete before Deployment)
kubectl apply -f k8s/backend/migrate-job.yaml -n caloriechecker-prod

# Wait for the Job to complete
kubectl wait --for=condition=complete job/django-migrate -n caloriechecker-prod --timeout=300s

# 2. Deploy the backend
kubectl apply -f k8s/backend/deployment.yaml -n caloriechecker-prod
kubectl apply -f k8s/backend/service.yaml -n caloriechecker-prod
kubectl apply -f k8s/backend/hpa.yaml -n caloriechecker-prod
kubectl apply -f k8s/backend/pdb.yaml -n caloriechecker-prod

# 3. Deploy the frontend
kubectl apply -f k8s/frontend/deployment.yaml -n caloriechecker-prod
kubectl apply -f k8s/frontend/service.yaml -n caloriechecker-prod
kubectl apply -f k8s/frontend/hpa.yaml -n caloriechecker-prod
kubectl apply -f k8s/frontend/pdb.yaml -n caloriechecker-prod

# 4. Apply the Ingress routing rules
kubectl apply -f k8s/ingress/ingress.yaml -n caloriechecker-prod
```

Or apply everything at once using `kubectl apply -f` on directories:

```bash
# Apply the entire k8s directory recursively
kubectl apply -R -f k8s/ --namespace caloriechecker-prod
```

---

## Step 5: Test the deployment

```bash
# Get the external IP again (save it for the commands below)
EXTERNAL_IP=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "External IP: $EXTERNAL_IP"

# Test the frontend (should return the React app HTML)
curl -I http://$EXTERNAL_IP/
# Expected: HTTP/1.1 200 OK

# Test the backend API health endpoint
curl http://$EXTERNAL_IP/api/health/
# Expected: {"status": "healthy", "database": "connected"}

# Test the Django admin (should return the admin login page)
curl -I http://$EXTERNAL_IP/admin/
# Expected: HTTP/1.1 200 OK
```

---

## Step 6: (Optional) Use a real domain name

If you have a domain (e.g., `caloriechecker.com`):

### 6a. Point your domain to the cluster

In your DNS provider (e.g., DigitalOcean DNS, Cloudflare, Route53), add an **A record**:

```
Type: A
Name: @  (or "caloriechecker.com")
Value: <YOUR_EXTERNAL_IP>
TTL: 300

# Also add www subdomain:
Type: A  
Name: www
Value: <YOUR_EXTERNAL_IP>
TTL: 300
```

DNS propagation takes 5 minutes to 48 hours (usually under 1 hour).

### 6b. Update the Ingress to use the domain

Edit `k8s/ingress/ingress.yaml` and add a `host` field:

```yaml
spec:
  rules:
    - host: caloriechecker.com   # <-- add this line
      http:
        paths:
          # ... rest of your paths
```

Then re-apply: `kubectl apply -f k8s/ingress/ingress.yaml`

### 6c. Enable HTTPS with cert-manager (free SSL via Let's Encrypt)

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

# Wait for cert-manager to be ready
kubectl wait --for=condition=available deployment/cert-manager -n cert-manager --timeout=120s
```

Create a ClusterIssuer (`k8s/ingress/cluster-issuer.yaml`):
```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com   # Replace with your email
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```

Then add TLS to the Ingress (uncomment the `tls:` section in `ingress.yaml`).

---

## Troubleshooting

```bash
# View Ingress Controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx --tail=50

# Describe the Ingress to see events and backend addresses
kubectl describe ingress caloriechecker-ingress -n caloriechecker-prod

# Check if backend endpoints are discovered
kubectl get endpoints -n caloriechecker-prod

# Check pod status
kubectl get pods -n caloriechecker-prod

# View pod logs (replace with actual pod name)
kubectl logs -n caloriechecker-prod -l app=backend --tail=50
kubectl logs -n caloriechecker-prod -l app=frontend --tail=50

# Check HPA status
kubectl get hpa -n caloriechecker-prod

# Check PDB status
kubectl get pdb -n caloriechecker-prod
```

---

## Architecture Summary

After completing all steps, your infrastructure looks like this:

```
Internet
    |
    v
DigitalOcean Load Balancer  [~$12/month]
(created automatically by nginx-ingress Helm install)
    |
    v
nginx-ingress-controller pods (2x, in ingress-nginx namespace)
[reads Ingress rules, routes traffic]
    |
    |-- /api/*   --> backend Service (ClusterIP) --> Django pods (2-5x)
    |-- /admin/* --> backend Service (ClusterIP) --> Django pods (2-5x)
    `-- /*       --> frontend Service (ClusterIP) --> Nginx/React pods (2-4x)
                                                          |
                                                     PostgreSQL StatefulSet
                                                     (1 pod, 10GB PVC)
```

**Monthly cost estimate on DigitalOcean:**
- 2 worker nodes (s-2vcpu-4gb): ~$48/month
- 1 Load Balancer: ~$12/month
- PostgreSQL PVC (10GB): ~$1/month
- **Total: ~$61/month**
