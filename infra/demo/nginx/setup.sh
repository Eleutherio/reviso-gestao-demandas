#!/bin/bash
# Setup Nginx reverse proxy with Let's Encrypt SSL

set -e

echo "=== Reviso API - Nginx Setup ==="

# 1. Install dependencies
echo "Installing Nginx and Certbot..."
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx ufw

# 2. Configure firewall
echo "Configuring firewall..."
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw --force enable
sudo ufw status

echo "IMPORTANT: PostgreSQL port (5432/5433) is NOT exposed"

# 3. Create certbot webroot
sudo mkdir -p /var/www/certbot

# 4. Copy Nginx config
echo "Copying Nginx configuration..."
sudo cp nginx/reviso-api.conf /etc/nginx/sites-available/reviso-api

# 5. Enable site
sudo ln -sf /etc/nginx/sites-available/reviso-api /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 6. Test Nginx config
echo "Testing Nginx configuration..."
sudo nginx -t

# 7. Reload Nginx
sudo systemctl reload nginx

# 8. Obtain SSL certificate
echo "Obtaining Let's Encrypt certificate..."
echo "Make sure DNS A record for api.seudominio.com points to this server IP"
read -p "Press Enter to continue..."

sudo certbot certonly --webroot \
    -w /var/www/certbot \
    -d api.seudominio.com \
    --email seu-email@exemplo.com \
    --agree-tos \
    --no-eff-email

# 9. Update Nginx config with SSL
sudo nginx -t && sudo systemctl reload nginx

# 10. Setup auto-renewal
echo "Setting up SSL auto-renewal..."
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

echo ""
echo "=== Setup Complete ==="
echo "API available at: https://api.seudominio.com"
echo "SSL certificate will auto-renew via certbot.timer"
echo ""
echo "Firewall status:"
sudo ufw status numbered
echo ""
echo "Test endpoints:"
echo "  curl https://api.seudominio.com/actuator/health"
echo "  curl https://api.seudominio.com/auth/login"
