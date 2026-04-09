#!/bin/bash
# SSH Hardening + Fail2ban Setup

set -e

echo "=== SSH Hardening ==="

# 1. Backup SSH config
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# 2. Harden SSH
echo "Hardening SSH configuration..."
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config

# 3. Test SSH config
sudo sshd -t

# 4. Restart SSH
sudo systemctl restart sshd

echo "SSH hardened: password auth disabled, root login disabled"

# 5. Install Fail2ban
echo "Installing Fail2ban..."
sudo apt update
sudo apt install -y fail2ban

# 6. Configure Fail2ban
sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
destemail = seu-email@exemplo.com
sendername = Fail2Ban

[sshd]
enabled = true
port = 22
logpath = /var/log/auth.log
maxretry = 3
bantime = 7200

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/reviso-api-error.log
maxretry = 5
bantime = 3600
EOF

# 7. Create Nginx filter
sudo tee /etc/fail2ban/filter.d/nginx-limit-req.conf > /dev/null <<EOF
[Definition]
failregex = limiting requests, excess:.* by zone.*client: <HOST>
ignoreregex =
EOF

# 8. Enable and start Fail2ban
sudo systemctl enable fail2ban
sudo systemctl restart fail2ban

echo ""
echo "=== Setup Complete ==="
echo "SSH: Password auth disabled, key-only"
echo "Fail2ban: Active for SSH and Nginx rate limiting"
echo ""
echo "Check status:"
echo "  sudo fail2ban-client status"
echo "  sudo fail2ban-client status sshd"
echo "  sudo fail2ban-client status nginx-limit-req"
