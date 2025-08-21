# AWS Lambda API with TypeScript

A modular TypeScript Node.js project for AWS Lambda with the following features:

- REST API service
- CSV file reading and processing
- Gmail email sending
- Google Docs content reading
- Modular architecture design
- Code formatting and quality checks (Prettier + ESLint)

## Features

### 📡 API Endpoints

- `GET /hello` - Basic health check
- `POST /csv` - Read and process CSV data
- `POST /email` - Send emails
- `POST /docs` - Read Google Docs content

### 📁 Modular Architecture

```
src/
├── config/          # Configuration files
├── handlers/        # API handlers
├── services/        # Business logic services
├── types/          # TypeScript type definitions
└── index.ts        # Main entry point
```

### 🛠️ Development Tools

- **TypeScript** - Type-safe JavaScript
- **Prettier** - Code formatting
- **ESLint** - Code quality checks
- **Jest** - Unit testing framework
- **Git Hooks** - Automated code checks

## Installation and Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

```bash
cp .env.example .env
# Edit .env file and fill in your configuration
```

### 3. Gmail App Password Setup

1. Sign in to your Google Account
2. Enable 2FA (Two-Factor Authentication)
3. Generate an App Password
4. Add the App Password to `GMAIL_APP_PASSWORD` in `.env` file

### 4. Google API Setup (Optional)

1. Create a service account in Google Cloud Console
2. Download the credentials JSON file
3. Add the file path to `GOOGLE_CREDENTIALS_PATH` in `.env` file

### 5. Setup Git Hooks (Optional)

```bash
chmod +x scripts/setup-git-hooks.sh
./scripts/setup-git-hooks.sh
```

## Development Commands

### Code Formatting

```bash
# Format all files
npm run format

# Check formatting (without modifying files)
npm run format:check
```

### Code Quality Checks

```bash
# Run ESLint checks
npm run lint

# Auto-fix ESLint issues
npm run lint:fix
```

### Build and Run

```bash
# Compile TypeScript
npm run build

# Local development mode
npm run dev

# Run compiled code
npm start
```

### Testing

```bash
# Run tests
npm test
```

### Deployment Preparation

```bash
# Prepare deployment files (build + package)
npm run deploy

# Pre-commit checks (format + lint + build)
npm run pre-commit
```

## API Usage Examples

### 1. Hello Endpoint

```bash
curl -X GET http://localhost:3000/hello
```

### 2. Read CSV

```bash
curl -X POST http://localhost:3000/csv \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "./data/sample.csv"
  }'
```

### 3. Send Email

```bash
curl -X POST http://localhost:3000/email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Test Email",
    "text": "Hello from Lambda!"
  }'
```

### 4. Read Google Docs

```bash
curl -X POST http://localhost:3000/docs \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "your-document-id"
  }'
```

## AWS Lambda Deployment

### 1. Create Deployment Package

```bash
npm run deploy
```

### 2. Upload to AWS Lambda

- Use AWS CLI or AWS Console
- Upload `lambda-deployment.zip`
- Configure environment variables
- Setup API Gateway (if needed)

### 3. Environment Variables Setup

Configure the following environment variables in AWS Lambda:

- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `GOOGLE_CREDENTIALS_PATH` (if using Google Docs)

## Development Tools Configuration

### VS Code Setup

The project includes VS Code configuration files with support for:

- Auto-formatting (on save)
- ESLint integration
- TypeScript support
- Recommended extensions

### Git Hooks

Once set up, pre-commit hooks will automatically run:

- Prettier formatting checks
- ESLint code quality checks
- TypeScript compilation checks

## Project Structure

```
├── .vscode/              # VS Code configuration
├── scripts/              # Helper scripts
├── src/
│   ├── config/          # Application configuration
│   ├── handlers/        # API route handlers
│   ├── services/        # Business logic services
│   ├── types/          # TypeScript type definitions
│   └── index.ts        # Lambda entry point
├── .eslintrc.js         # ESLint configuration
├── .prettierrc          # Prettier configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Project dependencies
```

## Code Style Guide

This project uses Prettier and ESLint to maintain consistent code style:

- **Indentation**: 2 spaces
- **Quotes**: Single quotes
- **Semicolons**: Required
- **Line width**: 80 characters
- **Trailing commas**: ES5 style

## Troubleshooting

### Common Issues

1. **Gmail Authentication Failed**
   - Make sure 2FA is enabled
   - Use App Password instead of regular password

2. **Google Docs API Error**
   - Check service account credentials file path
   - Verify document sharing permissions

3. **TypeScript Compilation Error**
   - Run `npm run build` to check specific errors
   - Ensure all type definitions are correct

4. **Lambda Deployment Issues**
   - Check environment variable configuration
   - Verify deployment package size limits

## File Format Recommendations

### CSV vs Google Docs

- **CSV files** are recommended for programmatic processing due to:
  - Simple format and fast parsing
  - Mature parsing libraries available
  - Better performance for large datasets
- **Google Docs** are suitable when you need:
  - Formatted content reading
  - Real-time collaboration features
  - Rich text processing

## API Response Format

All API endpoints return responses in the following format:

```typescript
{
  "success": boolean,
  "message": string,
  "data": any,           // Optional
  "timestamp": string,   // Only for /hello endpoint
  "version": string      // Only for /hello endpoint
}
```

## Error Handling

The API uses standard HTTP status codes:

- `200` - Success
- `400` - Bad Request (missing or invalid parameters)
- `500` - Internal Server Error
- `503` - Service Unavailable (Google Docs service not configured)

## Security Considerations

- Use environment variables for sensitive information
- Gmail App Passwords provide secure authentication
- Google service account credentials should be kept secure
- CORS is enabled for web browser access

## Performance Tips

- CSV processing is optimized for large files
- Email sending includes connection verification
- Google Docs API calls are cached when possible
- Lambda cold start optimization included

## Contributing

1. Follow the established code style (enforced by Prettier/ESLint)
2. Add tests for new features
3. Update documentation as needed
4. Use conventional commit messages

## License

MIT License
