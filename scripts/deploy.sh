#!/bin/bash

# MOH Tender System - Production Deployment Script
# Usage: ./scripts/deploy.sh [setup|start|stop|restart|logs|backup|ssl]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env.production"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_env() {
    if [ ! -f "$ENV_FILE" ]; then
        log_error ".env.production file not found!"
        log_info "Copy .env.production.example to .env.production and configure it."
        exit 1
    fi
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed!"
        exit 1
    fi
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed!"
        exit 1
    fi
}

setup_ssl() {
    log_info "Setting up SSL certificates..."

    if [ -z "$DOMAIN" ]; then
        read -p "Enter your domain (e.g., yourdomain.com): " DOMAIN
    fi

    # Create self-signed certificate for initial setup
    mkdir -p "$PROJECT_DIR/nginx/ssl"

    if [ ! -f "$PROJECT_DIR/nginx/ssl/fullchain.pem" ]; then
        log_info "Generating self-signed certificate for initial setup..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$PROJECT_DIR/nginx/ssl/privkey.pem" \
            -out "$PROJECT_DIR/nginx/ssl/fullchain.pem" \
            -subj "/CN=$DOMAIN"
        log_warn "Self-signed certificate created. Replace with Let's Encrypt for production!"
    fi

    log_info "SSL setup complete!"
    log_info ""
    log_info "For Let's Encrypt certificates, run:"
    log_info "  sudo certbot certonly --standalone -d $DOMAIN"
    log_info "Then copy certificates to nginx/ssl/"
}

setup() {
    log_info "Setting up production environment..."
    check_docker

    # Create directories
    mkdir -p "$PROJECT_DIR/nginx/ssl"
    mkdir -p "$PROJECT_DIR/mysql/init"
    mkdir -p "$PROJECT_DIR/backups"

    # Check for env file
    if [ ! -f "$ENV_FILE" ]; then
        log_info "Creating .env.production from template..."
        cp "$PROJECT_DIR/.env.production.example" "$ENV_FILE"
        log_warn "Please edit .env.production with your configuration!"
        exit 0
    fi

    setup_ssl

    log_info "Setup complete! Run './scripts/deploy.sh start' to launch."
}

start() {
    log_info "Starting production services..."
    check_env
    check_docker

    cd "$PROJECT_DIR"
    docker-compose -f docker-compose.prod.yml --env-file "$ENV_FILE" up -d --build

    log_info "Services started!"
    log_info "Application: https://localhost (or your domain)"

    # Wait and show status
    sleep 5
    docker-compose -f docker-compose.prod.yml ps
}

stop() {
    log_info "Stopping production services..."
    cd "$PROJECT_DIR"
    docker-compose -f docker-compose.prod.yml down
    log_info "Services stopped."
}

restart() {
    log_info "Restarting production services..."
    stop
    start
}

logs() {
    cd "$PROJECT_DIR"
    docker-compose -f docker-compose.prod.yml logs -f "${2:-app}"
}

backup() {
    log_info "Creating database backup..."
    check_env

    cd "$PROJECT_DIR"
    docker-compose -f docker-compose.prod.yml --profile backup run --rm backup

    log_info "Backup created in ./backups/"
    ls -la "$PROJECT_DIR/backups/"
}

status() {
    cd "$PROJECT_DIR"
    docker-compose -f docker-compose.prod.yml ps
}

update() {
    log_info "Updating application..."

    # Pull latest code
    git pull origin main

    # Rebuild and restart
    restart

    log_info "Update complete!"
}

# Main command handler
case "$1" in
    setup)
        setup
        ;;
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    logs)
        logs "$@"
        ;;
    backup)
        backup
        ;;
    status)
        status
        ;;
    ssl)
        setup_ssl
        ;;
    update)
        update
        ;;
    *)
        echo "MOH Tender System - Production Deployment"
        echo ""
        echo "Usage: $0 {setup|start|stop|restart|logs|backup|status|ssl|update}"
        echo ""
        echo "Commands:"
        echo "  setup    - Initial setup (create dirs, SSL, etc.)"
        echo "  start    - Start all services"
        echo "  stop     - Stop all services"
        echo "  restart  - Restart all services"
        echo "  logs     - View logs (optionally specify service: logs app|nginx|mysql)"
        echo "  backup   - Create database backup"
        echo "  status   - Show service status"
        echo "  ssl      - Setup/renew SSL certificates"
        echo "  update   - Pull latest code and restart"
        exit 1
        ;;
esac
