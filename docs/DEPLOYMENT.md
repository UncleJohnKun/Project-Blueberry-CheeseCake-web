# 🚀 Secure Deployment Guide

This guide provides step-by-step instructions for securely deploying the Kamusta Po Guro Admin Dashboard.

## 📋 Pre-Deployment Security Checklist

### ✅ Environment Configuration
- [ ] All sensitive data moved to environment variables
- [ ] `.env` file created with production values
- [ ] Firebase service account key properly configured
- [ ] JWT secret is strong and unique (minimum 32 characters)
- [ ] Database connection strings are secure
- [ ] API keys are not exposed in client-side code

### ✅ Authentication & Authorization
- [ ] Default admin password changed
- [ ] Password hashing is enabled (bcrypt)
- [ ] JWT tokens have appropriate expiration times
- [ ] Rate limiting is configured
- [ ] Session timeout is set appropriately
- [ ] CSRF protection is enabled

### ✅ Data Protection
- [ ] Input validation is implemented
- [ ] SQL injection protection is active
- [ ] XSS protection is enabled
- [ ] File upload restrictions are in place
- [ ] Sensitive data is encrypted at rest

### ✅ Infrastructure Security
- [ ] HTTPS is enforced
- [ ] Security headers are configured
- [ ] CORS is properly configured
- [ ] Error handling doesn't leak sensitive information
- [ ] Logging is configured for security events

### ✅ Code Security
- [ ] Dependencies are up to date
- [ ] Security vulnerabilities are patched
- [ ] Code has been reviewed for security issues
- [ ] Secrets are not committed to version control
- [ ] Debug mode is disabled in production

## 🔧 Production Environment Setup

### 1. Server Requirements

**Minimum Requirements:**
- Node.js 16+ LTS
- 2GB RAM
- 20GB storage
- SSL certificate
- Firewall configured

**Recommended:**
- Node.js 18+ LTS
- 4GB+ RAM
- 50GB+ SSD storage
- Load balancer
- CDN for static assets

### 2. Environment Variables

Create a production `.env` file:

```bash
# Production Environment
NODE_ENV=production
PORT=443

# Firebase Configuration
FIREBASE_PROJECT_ID=your-production-project-id
FIREBASE_API_KEY=your-production-api-key
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com

# Security Configuration
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=3600000
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900000

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com

# Admin Configuration
ADMIN_EMAIL=admin@yourdomain.com
DEFAULT_ADMIN_PASSWORD=change-this-immediately
```

### 3. SSL/TLS Configuration

**Option A: Using Let's Encrypt (Recommended)**
```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Configure auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

**Option B: Using Custom Certificate**
```bash
# Place your certificate files
/etc/ssl/certs/yourdomain.com.crt
/etc/ssl/private/yourdomain.com.key
```

### 4. Firewall Configuration

```bash
# Ubuntu/Debian with UFW
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (for redirects)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw deny 3000/tcp   # Block direct access to Node.js

# CentOS/RHEL with firewalld
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## 🚀 Deployment Steps

### 1. Server Setup

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Create application user
sudo useradd -m -s /bin/bash appuser
sudo usermod -aG sudo appuser
```

### 2. Application Deployment

```bash
# Clone repository
git clone <your-repository-url> /opt/kamusta-admin
cd /opt/kamusta-admin

# Install dependencies
npm ci --only=production

# Set ownership
sudo chown -R appuser:appuser /opt/kamusta-admin

# Switch to app user
sudo su - appuser
cd /opt/kamusta-admin

# Configure environment
cp .env.example .env
# Edit .env with production values

# Run password migration (one-time only)
node scripts/migrate-passwords.js

# Start application with PM2
pm2 start server.js --name "kamusta-admin"
pm2 save
pm2 startup
```

### 3. Reverse Proxy Setup (Nginx)

```nginx
# /etc/nginx/sites-available/kamusta-admin
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/auth/ {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://localhost:3000;
        # ... other proxy settings
    }

    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
        # ... other proxy settings
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/kamusta-admin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔍 Post-Deployment Security Verification

### 1. Security Headers Check
```bash
curl -I https://yourdomain.com
# Verify presence of security headers
```

### 2. SSL Configuration Test
```bash
# Test SSL configuration
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Or use online tools:
# https://www.ssllabs.com/ssltest/
```

### 3. Application Security Test
```bash
# Test rate limiting
for i in {1..20}; do curl https://yourdomain.com/api/health; done

# Test authentication
curl -X POST https://yourdomain.com/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'
```

## 📊 Monitoring & Maintenance

### 1. Log Monitoring

```bash
# Application logs
pm2 logs kamusta-admin

# System logs
sudo journalctl -u nginx -f
sudo tail -f /var/log/auth.log
```

### 2. Security Monitoring

```bash
# Monitor failed login attempts
grep "Authentication failed" /var/log/kamusta-admin.log

# Monitor rate limiting
grep "Rate limit" /var/log/nginx/access.log

# Check for suspicious activity
sudo fail2ban-client status
```

### 3. Regular Maintenance

**Daily:**
- [ ] Check application logs for errors
- [ ] Monitor system resources
- [ ] Verify backup completion

**Weekly:**
- [ ] Review security logs
- [ ] Check for dependency updates
- [ ] Test backup restoration

**Monthly:**
- [ ] Security audit
- [ ] Performance optimization
- [ ] SSL certificate renewal check

## 🚨 Security Incident Response

### 1. Immediate Response
```bash
# Block suspicious IP
sudo ufw insert 1 deny from <suspicious-ip>

# Restart application
pm2 restart kamusta-admin

# Check for unauthorized access
sudo last -n 50
```

### 2. Investigation
```bash
# Check authentication logs
grep "failed" /var/log/kamusta-admin.log

# Check system access
sudo ausearch -m USER_LOGIN -ts recent

# Check file modifications
sudo find /opt/kamusta-admin -type f -mtime -1
```

### 3. Recovery
```bash
# Restore from backup if needed
# Update passwords
# Patch vulnerabilities
# Update security configurations
```

## 📞 Support Contacts

- **Security Issues**: security@yourdomain.com
- **Technical Support**: support@yourdomain.com
- **Emergency Contact**: +1-XXX-XXX-XXXX

---

**Remember**: Security is an ongoing process. Regularly review and update your security measures to protect against new threats.
