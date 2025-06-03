# 🔐 MailGuard - Hackdays 2025 Project

## 📚 Table of Contents

- [Overview](#-overview)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Development Setup](#-development-setup)
- [Architecture](#-architecture)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Configuration](#-configuration)
- [Troubleshooting](#-troubleshooting)
- [Showcases](#-showcases)
- [Contributing](#-contributing)

## 🎯 Overview

**MailGuard** is a lightweight, AI-enhanced plugin for the Open-Xchange email client that protects users from phishing threats by scoring incoming emails in real time.
It analyzes tone, urgency, sender identity, and embedded links, using both machine learning and threat intelligence to alert users via a color-coded risk bar.
Clear, contextual warnings and actionable tips help users make smarter decisions with every email.

## 📋 Prerequisites

### System Requirements

- **Python**: 3.10 or higher
- **Node.js**: 18 or higher
- **npm**: 9 or higher
- **Yarn**: Latest version (recommended package manager)
- **Git**: For version control
- **OpenSSL**: For SSL certificate generation

### Development Tools (Recommended)

- **IDE**: VS Code, WebStorm, or similar
- **Browser**: Chrome/Firefox with developer tools
- **Terminal**: Modern terminal with shell completion

## 🚀 Quick Start

### 1. Demo Account

Go to https://www.ohlala-croissant.fr/ to create your demo account.

### 2. Clone the Repository

```bash
git clone https://github.com/extrymes/project-hackdays2025
cd project-hackdays2025
```

### 3. Environment Setup

#### In `root/` directory

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables as needed
nano .env
```

#### In `core-ui/` directory

```bash
# Copy environment template
cp .env.defaults .env

# Edit environment variables as needed
nano .env
```

Update this value:

```env
SERVER=https://webmail.ohlala-croissant.fr/appsuite/
```

### 4. Backend Server Setup

```bash
# Activate virtual environment
pipenv shell

# Install Python dependencies
pipenv install

# Start the Python server
cd server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Frontend Development Server

```bash
# Navigate to core-ui directory
cd core-ui

# Install Yarn globally (if not already installed)
npm install -g yarn

# Install project dependencies
yarn install

# Generate SSL certificates for development
yarn setup:ssl

# Start development server
yarn dev
```

## 🛠 Development Setup

### SSL Certificate Setup

For HTTPS development, generate local SSL certificates:

```bash
cd core-ui
mkdir -p ssl
openssl req -x509 -newkey rsa:4096 \
  -keyout ssl/host.key \
  -out ssl/host.crt \
  -days 365 \
  -nodes \
  -subj "/C=US/ST=State/L=City/O=Organization/OU=OrgUnit/CN=localhost"
```

### Development Workflow

1. **Start Backend**: `cd server && uvicorn main:app --reload`
2. **Start Frontend**: `cd core-ui && yarn dev`
3. **Run Tests**: `yarn test` or `yarn e2e`
4. **Lint Code**: `yarn lint`
5. **Build Production**: `yarn build`

## 🏗 Architecture

### Frontend Architecture

- **Framework**: Modern JavaScript/TypeScript with module bundling
- **UI Components**: Modular component architecture
- **State Management**: Centralized state with reactive updates
- **Routing**: Client-side routing with deep linking support
- **API Integration**: RESTful API communication with the backend

### Backend Architecture

- **Framework**: FastAPI (Python)
- **Database**: Configurable database support
- **Authentication**: JWT-based authentication with OAuth integration
- **API**: RESTful API design with OpenAPI documentation

### Directory Structure

```
core-ui/
├── src/                   # Source code
│   ├── io.ox/             # Core application modules
│   ├── themes/            # Theme and styling
│   ├── i18n/              # Internationalization files
│   └── lib/               # Shared libraries
├── e2e/                   # End-to-end tests
├── spec/                  # Unit tests
├── public/                # Static assets
├── docs/                  # Documentation
└── scripts/               # Build and utility scripts

server/
├── server.py              # FastAPI application entry point
└── analyze_tools/         # Analysis and debugging tools
```

## 🧪 Testing

### Running Tests

```bash
# Unit tests
yarn test

# End-to-end tests
yarn e2e

# Specific test suites
yarn test:mail
yarn test:calendar
yarn test:contacts

# Accessibility tests
yarn test:a11y

# Mobile tests
yarn test:mobile
```

### Test Coverage

Generate test coverage reports:

```bash
yarn test:coverage
```

### Writing Tests

- **Unit Tests**: Located in `spec/` directory
- **E2E Tests**: Located in `e2e/tests/` directory
- **Test Framework**: Uses modern testing frameworks with page objects pattern

## 🚀 Deployment

### Production Build

```bash
# Build optimized production bundle
yarn build

# Verify build
yarn build:analyze
```

### Docker Deployment

```bash
# Build container
docker build -t core-ui .

# Run container
docker run -p 8337:8337 core-ui
```

### Environment-Specific Deployments

- **Development**: `yarn dev`
- **Staging**: `yarn build:staging`
- **Production**: `yarn build:production`

## ⚙️ Configuration

### Customization Options

- **Themes**: Modify files in `src/themes/`
- **Localization**: Add languages in `src/i18n/`
- **Features**: Configure modules in `src/io.ox/`
- **Branding**: Update assets in `public/themes/`

### Plugin Development

Create custom plugins in the `src/plugins/` directory following the established patterns.

## 🔧 Troubleshooting

### Common Issues

**Port Already in Use**

```bash
# Find and kill process using port 8337
lsof -ti:8337 | xargs kill -9
```

**SSL Certificate Issues**

```bash
# Regenerate certificates
rm -rf ssl/
yarn setup:ssl
```

**Dependency Issues**

```bash
# Clear and reinstall dependencies
rm -rf node_modules yarn.lock
yarn install
```

**Python Environment Issues**

```bash
# Reset virtual environment
pipenv --rm
pipenv install
```

### Debug Mode

Enable debug logging:

```bash
DEBUG=true yarn dev
```

### Performance Issues

- Check browser developer tools for console errors
- Monitor network requests in the Network tab
- Use the built-in performance profiler

## 🌐 Access Points

Once running, access the application at:

- **Development HTTPS**: https://localhost:8337
- **API Documentation**: http://localhost:8000/docs

## 🔧 Available Scripts

### Frontend Scripts

| Command           | Description                               |
| ----------------- | ----------------------------------------- |
| `yarn dev`        | Start development server with hot reload  |
| `yarn build`      | Build optimized production bundle         |
| `yarn test`       | Run unit test suite                       |
| `yarn e2e`        | Run end-to-end tests                      |
| `yarn lint`       | Run ESLint code analysis                  |
| `yarn lint:fix`   | Fix automatically fixable lint issues     |
| `yarn type-check` | Run TypeScript type checking              |
| `yarn setup:ssl`  | Generate SSL certificates for development |

### Backend Scripts

| Command                     | Description                  |
| --------------------------- | ---------------------------- |
| `pipenv install`            | Install Python dependencies  |
| `pipenv shell`              | Activate virtual environment |
| `uvicorn main:app --reload` | Start development server     |
| `python -m pytest`          | Run Python tests             |

## 📸 Showcases
![example1](https://i.imgur.com/nvlvk2G.png)
![example2](https://i.imgur.com/E3gt5cy.png)

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes using conventional commits
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

---

Made with ❤️ by **Sovereign42**
