#!/bin/bash
# Database Security + Backup Setup

set -e

echo "=== Database Security & Backup ==="

# 1. Check strong password
if [ -z "$DB_PASSWORD" ]; then
    echo "ERROR: DB_PASSWORD not set"
    echo "Generate strong password:"
    echo "  openssl rand -base64 32"
    exit 1
fi

if [ ${#DB_PASSWORD} -lt 20 ]; then
    echo "WARNING: DB_PASSWORD should be at least 20 characters"
fi

# 2. Create backup directory
sudo mkdir -p /var/backups/reviso
sudo chown $(whoami):$(whoami) /var/backups/reviso
sudo chmod 700 /var/backups/reviso

# 3. Create backup script
cat > /tmp/backup-db.sh <<'EOF'
#!/bin/bash
# Daily database backup

BACKUP_DIR="/var/backups/reviso"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/reviso_$DATE.sql.gz"

# Backup
docker compose -f /path/to/docker-compose.demo.yml exec -T postgres \
  pg_dump -U reviso reviso | gzip > "$BACKUP_FILE"

# Keep only last 7 days
find "$BACKUP_DIR" -name "reviso_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
EOF

sudo mv /tmp/backup-db.sh /usr/local/bin/backup-reviso-db.sh
sudo chmod +x /usr/local/bin/backup-reviso-db.sh

# 4. Setup cron (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-reviso-db.sh >> /var/log/reviso-backup.log 2>&1") | crontab -

# 5. Setup unattended-upgrades (security updates)
echo "Installing unattended-upgrades..."
sudo apt update
sudo apt install -y unattended-upgrades

sudo tee /etc/apt/apt.conf.d/50unattended-upgrades > /dev/null <<EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

sudo tee /etc/apt/apt.conf.d/20auto-upgrades > /dev/null <<EOF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

sudo systemctl enable unattended-upgrades
sudo systemctl start unattended-upgrades

echo ""
echo "=== Setup Complete ==="
echo "Backup: Daily at 2 AM, kept for 7 days"
echo "Location: /var/backups/reviso/"
echo "Security updates: Automatic"
echo ""
echo "Manual backup:"
echo "  /usr/local/bin/backup-reviso-db.sh"
echo ""
echo "Restore backup:"
echo "  gunzip < backup.sql.gz | docker compose exec -T postgres psql -U reviso reviso"
