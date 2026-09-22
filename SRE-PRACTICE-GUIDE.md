# SRE Practice - Microservices System

This is a 3-service microservices system designed for SRE practice and learning.

## Architecture

```
┌─────────────┐
│   Frontend  │ (NGINX static site)
│   Port 80   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ API Gateway │ (Node.js/Express)
│  Port 3000  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Backend   │ (Node.js + SQLite)
│  Port 5000  │
└─────────────┘
```

## Services

### 1. Frontend Service
- **Technology**: NGINX (Alpine)
- **Port**: 80
- **Purpose**: User interface
- **Health Check**: HTTP GET /
- **SRE Practice**: Monitor static content delivery, CDN behavior

### 2. API Gateway Service
- **Technology**: Node.js + Express
- **Port**: 3000
- **Purpose**: Request routing, rate limiting, security
- **Health Check**: HTTP GET /health
- **Metrics**: HTTP GET /api/metrics
- **SRE Practice**: 
  - Rate limiting monitoring
  - Service-to-service communication
  - Timeout handling
  - Circuit breaker patterns

### 3. Backend Service
- **Technology**: Node.js + SQLite
- **Port**: 5000
- **Purpose**: Business logic, data persistence
- **Health Check**: HTTP GET /health
- **Metrics**: HTTP GET /metrics
- **SRE Practice**:
  - Database connection monitoring
  - Query performance
  - Data consistency
  - Resource utilization

## SRE Practice Scenarios

### 1. Monitoring & Observability
```bash
# Check service health
curl http://frontend-service/health
curl http://api-gateway-service:3000/health
curl http://backend-service:5000/health

# Get metrics
curl http://api-gateway-service:3000/api/metrics
curl http://backend-service:5000/metrics

# Monitor pod status
kubectl get pods
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

### 2. Service Failure Simulation
```bash
# Kill backend pod
kubectl delete pod -l app=backend

# Check how gateway handles backend failure
curl http://api-gateway-service:3000/api/users

# Watch automatic recovery
kubectl get pods -w
```

### 3. Performance Testing
```bash
# Slow endpoint testing
curl http://backend-service:5000/slow?delay=10000

# Load testing
ab -n 1000 -c 10 http://frontend-service/
```

### 4. Resource Monitoring
```bash
# Check resource usage
kubectl top pods
kubectl top nodes

# Check resource limits
kubectl describe deployment backend
```

### 5. Incident Response Practice
1. **Scenario**: Backend service becomes slow
   - Symptom: Increased response times
   - Debug: Check logs, metrics, pod status
   - Resolution: Scale up, restart, or fix code

2. **Scenario**: Database connection issues
   - Symptom: 503 errors from backend
   - Debug: Check backend logs, database connectivity
   - Resolution: Restart pods, check storage

3. **Scenario**: Gateway rate limiting
   - Symptom: 429 errors
   - Debug: Check rate limit configuration
   - Resolution: Adjust limits or implement caching

## SLO/SLI Definitions

### Service Level Objectives (SLOs)
- **Availability**: 99.5% per month
- **Latency**: 95th percentile < 500ms
- **Error Rate**: < 1% of requests

### Service Level Indicators (SLIs)
- **Availability**: Uptime percentage
- **Latency**: Request/response time
- **Error Rate**: HTTP 5xx responses / total requests
- **Saturation**: CPU/Memory usage

## Monitoring Setup

### Kubernetes Native Monitoring
```bash
# Install metrics-server (if not present)
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Check metrics
kubectl top pods
kubectl top nodes
```

### Log Monitoring
```bash
# Stream logs from all services
kubectl logs -l app=frontend -f
kubectl logs -l app=api-gateway -f
kubectl logs -l app=backend -f

# Check previous logs
kubectl logs <pod-name> --previous
```

### Health Check Monitoring
```bash
# Watch health status
watch kubectl get pods

# Check endpoint readiness
kubectl get endpoints
```

## Deployment

### Manual Deployment
```bash
# Build images locally
docker build -t sre-frontend:latest ./frontend
docker build -t sre-api-gateway:latest ./api-gateway
docker build -t sre-backend:latest ./backend

# Load images to k3s
docker save sre-frontend:latest | sudo k3s ctr images import -
docker save sre-api-gateway:latest | sudo k3s ctr images import -
docker save sre-backend:latest | sudo k3s ctr images import -

# Apply manifests
kubectl apply -f k8s-microservices/
```

### CI/CD Deployment
Push to `main` branch to trigger GitHub Actions workflow that:
1. Builds all three Docker images
2. Pushes to GitHub Container Registry
3. Deploys via SSM to your EC2 instance
4. Performs rolling updates

## Troubleshooting

### Common Issues

**Pods not starting**
```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

**Service not accessible**
```bash
kubectl get svc
kubectl get endpoints
kubectl describe svc <service-name>
```

**Image pull errors**
```bash
# Check image pull secret
kubectl get secrets
kubectl describe secret ghcr-secret
```

**High resource usage**
```bash
kubectl top pods
kubectl edit deployment <deployment-name> # Adjust resource limits
```

## SRE Learning Path

### Week 1: Basic Monitoring
- Set up health checks
- Monitor pod status
- Understand service communication
- Practice basic debugging

### Week 2: Metrics & Alerting
- Implement metrics collection
- Set up basic alerting
- Define SLOs/SLIs
- Practice incident response

### Week 3: Performance Optimization
- Load testing
- Resource tuning
- Performance profiling
- Capacity planning

### Week 4: Advanced SRE
- Chaos engineering
- Disaster recovery
- Multi-region deployment
- Advanced monitoring

## Notes

- This system is designed for learning, not production
- Uses SQLite for simplicity (not production-grade)
- Single-node k3s cluster (not HA)
- Basic security measures (enhance for production)
- SSM-based deployment (works with your existing setup)

## Access Points

- **Frontend**: `http://<node-ip>:30080`
- **API Gateway**: Internal cluster communication
- **Backend**: Internal cluster communication
- **Health Checks**: Each service has `/health` endpoint
- **Metrics**: Gateway `/api/metrics`, Backend `/metrics`