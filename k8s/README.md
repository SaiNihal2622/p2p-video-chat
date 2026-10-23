# Kubernetes Deployment

Production Kubernetes manifests for the P2P Video Chat **signaling server** —
a node.js WebSocket service deployed with HA, auto-scaling, probes, and TLS-ready ingress.

## What's included

| File | Resource | Purpose |
|---|---|---|
| `signaling.yaml` | **Deployment** | 3 replicas, pod anti-affinity, resource requests/limits, liveness + readiness probes, graceful termination |
| `signaling.yaml` | **Service** | ClusterIP load balancing across replicas |
| `signaling.yaml` | **ConfigMap** | Environment config (PORT, max peers, log level) |
| `signaling.yaml` | **HorizontalPodAutoscaler** | Scales 3→10 replicas at 60% CPU utilization |
| `signaling.yaml` | **Ingress** | NGINX ingress with WebSocket timeouts + websocket-services annotation |
| `Dockerfile` | Image | Multi-stage, non-root `node:20-alpine` runtime |

## Key production practices
- **Liveness probe** on `/health` → auto-restarts a hung pod
- **Readiness probe** → keeps a starting pod out of the Service until it can serve
- **Pod anti-affinity** → spreads replicas across Kubernetes nodes for resilience
- **Resource limits** → prevents noisy-neighbor CPU/memory abuse
- **HPA** → scales out under load, scales in when idle
- **Graceful shutdown** (30s) → lets open WebSocket clients disconnect cleanly
- **Non-root container** + minimal alpine image for security

## Deploy
```bash
# build & push the image (replace with your registry)
docker build -t ghcr.io/sainihal2622/p2p-signaling:latest .
docker push ghcr.io/sainihal2622/p2p-signaling:latest

# apply the manifests
kubectl apply -f k8s/signaling.yaml

# verify
kubectl get deploy,svc,hpa,ingress
kubectl rollout status deployment/p2p-signaling
```

## Health endpoint
The server exposes `GET /health` returning `{"status":"ok","rooms":N,"connections":N}` —
used by the liveness/readiness probes and for observability.
