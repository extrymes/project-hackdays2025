# Hackdays2025 Project

## 📋 Prerequisites

- Node.js 18 or higher
- npm 9 or higher

## 🚀 Quick Start

1. **Set up SSL certificates**
   ```bash
   cd core-ui
   mkdir ssl
   openssl req -x509 -newkey rsa:4096 \
     -keyout ssl/host.key \
     -out ssl/host.crt \
     -days 365 \
     -nodes \
     -subj "/C=US/ST=State/L=City/O=Organization/OU=OrgUnit/CN=localhost"
   ```

2. **Install Yarn package manager**
   ```bash
   npm install -g yarn
   ```

3. **Install project dependencies**
   ```bash
   yarn install
   ```

4. **Start development server**
   ```bash
   yarn dev
   ```

## 🌐 Access the Application

Once running, access the application at:
- HTTP: http://localhost:8337
- HTTPS: https://localhost:8337

## 🔧 Available Scripts

- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn test` - Run tests
- `yarn lint` - Run code linting
