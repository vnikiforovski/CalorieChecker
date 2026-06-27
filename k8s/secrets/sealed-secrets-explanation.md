# Kubernetes Secrets — Why They Are NOT Truly Secret

## The Fundamental Problem

Kubernetes `Secret` objects are **base64-encoded, not encrypted**.

Base64 is a *text encoding format*, not a security mechanism. Anyone who can
read the YAML file (or call `kubectl get secret`) can instantly decode the values:

```bash
# "Secret" value from a Kubernetes Secret:
echo "cG9zdGdyZXM=" | base64 --decode
# Output: postgres

# It takes 0.01 seconds. There is no key, no password, no protection.
```

| Property | base64 | Real Encryption (e.g. AES-256) |
|----------|--------|-------------------------------|
| Purpose | Text encoding | Confidentiality |
| Reversible without a key | ✅ Yes, trivially | ❌ No |
| Requires a secret key | ❌ No | ✅ Yes |
| Security protection | ❌ None | ✅ Strong |
| Example tool | `base64 --decode` | OpenSSL, age, Vault |

K8s base64-encodes Secret values so they can be safely stored in JSON/YAML
(which is text) and transmitted over HTTP APIs without binary encoding issues.
It provides **zero confidentiality**.

---

## Who Can Read Your Secrets?

By default in a Kubernetes cluster:

1. **Anyone with `kubectl get secret` access** — which is controlled by RBAC.
   If RBAC is not configured correctly, this includes all authenticated users.

2. **Anyone who can read the etcd database** — etcd stores all K8s objects.
   Cluster administrators with direct etcd access can read every secret in plaintext.

3. **Any pod running with the right ServiceAccount** — if a pod's SA has
   `get` permission on Secrets, the pod can read them via the K8s API.

4. **Anyone with the Secret YAML file** — if secrets.yaml is committed to Git
   (even a private repo), it is exposed to everyone with repo access.

---

## Partial Solution: etcd Encryption at Rest

Kubernetes CAN encrypt Secret values stored in etcd using `EncryptionConfiguration`:

```yaml
# /etc/kubernetes/encryption-config.yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources: [secrets]
    providers:
      - aescbc:
          keys:
            - name: key1
              secret: <base64-encoded-32-byte-key>
      - identity: {}  # Fallback: allow reading unencrypted secrets
```

With this config, secrets are encrypted *in the etcd database on disk*.
However:
- They are still readable by anyone with `kubectl get secret` permission
- DigitalOcean Kubernetes does not enable this by default
- Enabling it requires cluster-admin access to the API server configuration

---

## Solution 1: Bitnami Sealed Secrets

Sealed Secrets is an open-source project that makes it safe to commit encrypted
secrets to Git. The encryption key never leaves the cluster.

### How it works

```
[Your laptop]                         [K8s Cluster]
     │                                      │
     │  1. Download public key              │
     │ ◄── kubeseal --fetch-cert ───────────┤
     │                                      │
     │  2. Encrypt secret with public key   │
     │     kubeseal < secret.yaml           │
     │     > sealed-secret.yaml            │
     │                                      │
     │  3. Commit sealed-secret.yaml to Git │
     │     (SAFE — only decryptable         │
     │      by the cluster's controller)    │
     │                                      │
     │  4. kubectl apply -f sealed-secret.yaml
     ├──────────────────────────────────────►│
     │                                      │  5. Controller decrypts
     │                                      │     using private key
     │                                      │     Creates real k8s Secret
     │                                      │
```

### Install Sealed Secrets on DigitalOcean

```bash
# Step 1: Install the controller into the cluster
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/latest/download/controller.yaml

# Step 2: Wait for the controller to be ready
kubectl rollout status deployment/sealed-secrets-controller -n kube-system

# Step 3: Install kubeseal CLI
# macOS: brew install kubeseal
# Linux: curl -sL https://github.com/bitnami-labs/sealed-secrets/releases/latest/download/kubeseal-linux-amd64.tar.gz | tar xz && mv kubeseal /usr/local/bin/

# Step 4: Encrypt your Secret YAML
kubeseal --format yaml < k8s/secrets/secrets.yaml > k8s/secrets/sealed-secrets.yaml

# Step 5: Commit the sealed version (SAFE to commit to Git)
git add k8s/secrets/sealed-secrets.yaml
git commit -m "Add sealed application secrets"

# Step 6: Apply to the cluster
kubectl apply -f k8s/secrets/sealed-secrets.yaml
# The controller automatically creates the real kubernetes Secret
```

### Important: Back up the controller's private key

```bash
# The controller generates a private key on first install.
# If the controller is deleted, ALL SealedSecrets become permanently unreadable.
# Back up the key immediately:
kubectl get secret -n kube-system -l sealedsecrets.bitnami.com/sealed-secrets-key \
  -o yaml > sealed-secrets-controller-key-BACKUP.yaml

# Store this backup file somewhere secure (NOT in Git).
```

**Pros:** Simple to use, widely adopted, secrets safe to store in Git.
**Cons:** Controller must be installed; private key must be backed up carefully.

---

## Solution 2: External Secrets Operator (ESO)

Instead of storing secrets in Kubernetes at all, ESO pulls secrets from
purpose-built secret managers and syncs them into K8s Secrets automatically.

### Supported backends

- **AWS Secrets Manager** — popular in AWS-heavy shops
- **HashiCorp Vault** — industry standard, most flexible
- **Google Secret Manager** — GCP native
- **Azure Key Vault** — Azure native
- **DigitalOcean Secrets** — not yet officially supported (use Vault instead)

### How it works

```
[AWS Secrets Manager / Vault / etc.]
         │
         │  ESO controller polls every N minutes
         │  (or on change via webhook)
         ▼
[External Secrets Operator]  ──creates/updates──►  [Kubernetes Secret]
         │                                                │
         │  ExternalSecret CR defines:                  │
         │    - which external secret to read            │  Pods read
         │    - how to map keys                          │  normally via
         │    - how often to refresh                     │  secretKeyRef
```

### Install on DigitalOcean

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets-system \
  --create-namespace
```

### Example ExternalSecret (once ESO is installed)

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: caloriechecker-secrets
  namespace: caloriechecker-prod
spec:
  refreshInterval: 1h             # Pull from AWS every hour
  secretStoreRef:
    name: aws-secrets-manager     # Which backend to use
    kind: ClusterSecretStore
  target:
    name: caloriechecker-secrets  # Creates/updates this K8s Secret
    creationPolicy: Owner
  data:
    - secretKey: DJANGO_SECRET_KEY    # K8s Secret key name
      remoteRef:
        key: caloriechecker/prod      # AWS Secrets Manager secret name
        property: django_secret_key  # JSON property within the secret
    - secretKey: POSTGRES_PASSWORD
      remoteRef:
        key: caloriechecker/prod
        property: postgres_password
```

**Pros:** Secrets never stored in Kubernetes (or Git) at all; automatic rotation;
rich access audit logs in the external system.
**Cons:** External dependency; requires IAM setup; more moving parts.

---

## How to Encode Values for Kubernetes Secrets

All values in a Secret's `data:` field must be **base64-encoded**.

```bash
# CRITICAL: Always use -n to avoid encoding a trailing newline character.
# Without -n, the value stored would be "postgres\n" not "postgres",
# which breaks authentication silently.
echo -n "postgres" | base64
# Output: cG9zdGdyZXM=

echo -n "my-django-secret-key" | base64
# Output: bXktZGphbmdvLXNlY3JldC1rZXk=

# Decode to verify:
echo "cG9zdGdyZXM=" | base64 --decode
# Output: postgres  (no trailing newline)

# Generate a strong Django secret key:
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
# Then encode it:
echo -n "the-generated-key" | base64

# Generate a strong random password:
openssl rand -base64 32
# Note: This output IS already base64, but may contain + and / which
# are valid base64 chars. If your app doesn't like those chars, use:
openssl rand -hex 32
# Then encode: echo -n "the-hex-string" | base64
```

**Alternatively, use `stringData:` instead of `data:`:**

```yaml
# Using stringData: — Kubernetes auto-encodes the values.
# You write plain text; K8s stores it as base64 internally.
# kubectl get secret still shows base64 (not plaintext).
stringData:
  POSTGRES_PASSWORD: "my-actual-password"   # No base64 needed!
  DJANGO_SECRET_KEY: "my-actual-key"
```

---

## Security Best Practices Summary

| Practice | Why |
|----------|-----|
| Never commit `secrets.yaml` to Git | Even private repos can be leaked |
| Add `k8s/secrets/secrets.yaml` to `.gitignore` | Prevent accidental commits |
| Use Sealed Secrets or ESO | Make secrets GitOps-safe |
| Enable etcd encryption at rest | Protect against etcd database access |
| Restrict Secret RBAC tightly | Only pods that need a secret should read it |
| Use `automountServiceAccountToken: false` | Disable auto-mount if pod doesn't need K8s API |
| One Secret per application | Limits blast radius if one secret is compromised |
| Rotate secrets regularly | Limit the window of exposure after a breach |
| Enable audit logs | Know who read which secret and when |
| Avoid putting secrets in environment variables if possible | Secrets in env vars are visible in `kubectl describe pod` |

---

## Current State of This Project

The file `k8s/secrets/secrets.yaml` uses a **plain Kubernetes Secret** with
placeholder base64 values. This is acceptable for:
- Local development
- A learning/student project
- Infrastructure that is never committed to Git

**Before using this in real production:**
1. Replace all placeholder values with real, strong secrets
2. Add `k8s/secrets/secrets.yaml` to `.gitignore`
3. Install Sealed Secrets and convert this file to a `SealedSecret`
4. OR install External Secrets Operator and pull from a vault
5. Apply the Secret (or SealedSecret) with: `kubectl apply -f secrets.yaml`
