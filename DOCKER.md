# Docker Setup for n8n MCP Server

This document explains how to run the n8n MCP Server using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- An n8n instance running and accessible

## Quick Start

1. **Clone and prepare the environment:**
   ```bash
   git clone <repository-url>
   cd n8n-mcp
   cp .env.example .env
   ```

2. **Configure environment variables:**
   Edit `.env` file with your n8n configuration:
   ```bash
   N8N_API_KEY=your_actual_n8n_api_key
   N8N_BASE_URL=http://your-n8n-instance:5678
   MCP_PORT=3001
   ```

3. **Build and run with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

4. **Verify the server is running:**
   ```bash
   curl http://localhost:3001/health
   ```

## Docker Commands

### Build the image
```bash
docker build -t n8n-mcp-server .
```

### Run with Docker Compose (recommended)
```bash
# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the service
docker-compose down

# Restart the service
docker-compose restart
```

### Run with Docker directly
```bash
docker run -d \
  --name n8n-mcp-server \
  -p 3001:3001 \
  --env-file .env \
  n8n-mcp-server
```

## Configuration

### Environment Variables

The Docker setup reads environment variables from `.env` file:

| Variable       | Description                    | Default                 | Required |
| -------------- | ------------------------------ | ----------------------- | -------- |
| `N8N_API_KEY`  | n8n API key for authentication | -                       | Yes      |
| `N8N_BASE_URL` | Base URL of your n8n instance  | `http://localhost:5678` | Yes      |
| `MCP_PORT`     | Port for MCP server            | `3001`                  | No       |

### Docker Compose Features

- **Health checks**: Automatic health monitoring
- **Resource limits**: Memory and CPU constraints
- **Logging**: Structured JSON logs with rotation
- **Security**: Non-root user, no new privileges
- **Restart policy**: Automatic restart unless stopped
- **Network isolation**: Custom Docker network

## Monitoring

### Health Check
```bash
# Check container health
docker-compose ps

# Manual health check
curl http://localhost:3001/health
```

### Logs
```bash
# View real-time logs
docker-compose logs -f n8n-mcp-server

# View last 100 lines
docker-compose logs --tail=100 n8n-mcp-server
```

### Resource Usage
```bash
# View resource stats
docker stats n8n-mcp-server
```

## Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   # Change MCP_PORT in .env file
   MCP_PORT=3002
   ```

2. **n8n connection failed:**
   ```bash
   # Check n8n URL and API key
   docker-compose logs n8n-mcp-server
   ```

3. **Permission denied:**
   ```bash
   # Ensure .env file has correct permissions
   chmod 600 .env
   ```

### Debug Mode
```bash
# Run with debug output
docker-compose up --no-deps n8n-mcp-server
```

### Container Shell Access
```bash
# Access container shell for debugging
docker-compose exec n8n-mcp-server sh
```

## Production Deployment

### Recommendations

1. **Use secrets management** instead of `.env` files
2. **Set up proper monitoring** (Prometheus, Grafana)
3. **Configure log aggregation** (ELK stack, Fluentd)
4. **Use reverse proxy** (Nginx, Traefik) for SSL termination
5. **Set up backup strategy** for configurations

### Example with Traefik
```yaml
# Add to docker-compose.yml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.n8n-mcp.rule=Host(`mcp.yourdomain.com`)"
  - "traefik.http.routers.n8n-mcp.tls.certresolver=letsencrypt"
```

## Security Considerations

- Container runs as non-root user (nodejs:1001)
- No new privileges allowed
- Resource limits prevent resource exhaustion
- Environment variables should be properly secured
- Use Docker secrets in production environments

## Integration with MCP Clients

Once running, connect MCP clients to:
```
URL: http://localhost:3001/mcp
Transport: Streamable HTTP
Authentication: N8N-API-KEY header or Bearer token
```

Example with mcp-remote-client:
```bash
npx -p mcp-remote mcp-remote-client http://localhost:3001/mcp
``` 