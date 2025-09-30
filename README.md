# AllergyGuard - AI-Powered Food Safety Scanner

A development prototype for a comprehensive food safety application that helps users identify potential allergens and medication interactions in food products through barcode scanning and AI-powered analysis.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D18-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.6.3-blue.svg)
![Development](https://img.shields.io/badge/status-development--only-orange.svg)

## ⚠️ Development Notice

This is a **development-only prototype** designed for demonstration and learning purposes. It includes:
- In-memory data storage (no persistent database)
- Simplified authentication without sessions
- Mock data for testing features
- Development-optimized configuration

## 🌟 Features

### Core Functionality
- **Barcode Scanning**: Real-time camera-based barcode scanning for instant product identification
- **Manual Input**: Type ingredients manually for homemade or unlabeled foods
- **AI Analysis**: Google Gemini-powered ingredient analysis for allergen detection and drug interactions
- **Personalized Safety**: User-specific allergen and medication profiles for tailored recommendations
- **Development History**: In-memory scan tracking for testing (resets on restart)

### User Experience
- **Modern UI/UX**: Beautiful, responsive design with gradient themes and animations
- **Mobile-First**: Optimized for mobile devices with touch-friendly interfaces
- **Real-time Feedback**: Instant analysis results with visual safety indicators
- **Accessibility**: ARIA-compliant components with keyboard navigation support

### Development Features
- **Hot Reloading**: Fast development with Vite and TypeScript
- **Type Safety**: Full TypeScript implementation across frontend and backend
- **Component Library**: Radix UI with Tailwind CSS for rapid prototyping
- **Responsive Design**: Optimized for testing across all device sizes

## 🏗️ Architecture

### Frontend Stack
- **React 18** with TypeScript for component-based UI
- **Vite** for fast development and optimized builds
- **TanStack Query** for server state management and caching
- **Wouter** for lightweight client-side routing
- **Tailwind CSS** for utility-first styling
- **Radix UI** with shadcn/ui for accessible component primitives

### Backend Stack
- **Node.js** with Express.js framework
- **TypeScript** with ES modules for type safety
- **In-memory storage** for development testing
- **Google Gemini API** for AI-powered food analysis

### Data Storage
- **SQLite Database**: Lightweight, file-based database for development
- **Persistent Storage**: Data persists between server restarts
- **Local Development**: Database file stored in `data/` directory
- **Zero Configuration**: No database server setup required

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Google Gemini API key (required - for AI analysis features)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd AllergyScanAI
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment setup**
```bash
cp .env.example .env
```

4. **Configure environment variables**
```env
# Google Gemini (Required - for AI analysis)
GOOGLE_GEMINI_API_KEY=your_gemini_api_key

# Application
PORT=5000
```

5. **Start development server**
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

### Development Features
- **SQLite Integration**: Persistent data storage with zero configuration
- **Hot Reloading**: Changes are instantly reflected in the browser
- **TypeScript**: Full type checking during development
- **Auto Database Setup**: Database and tables created automatically on first run

## 📁 Project Structure

```
AllergyScanAI/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React contexts (Auth, Theme)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions and configurations
│   │   └── pages/          # Application pages/routes
├── server/                 # Backend Express application
│   ├── middleware/         # Express middleware (auth, security)
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic services
│   └── index.ts            # Server entry point
├── shared/                 # Shared TypeScript schemas and types
│   └── schema.ts           # Zod schemas for data validation
└── dist/                   # Production build output
```

## 🔧 Development

### Available Scripts

- **`npm run dev`** - Start development server with hot reloading
- **`npm run build`** - Build frontend for testing
- **`npm run check`** - TypeScript type checking

### Development Workflow

1. **Start the development server**
```bash
npm run dev
```

2. **Test features**
   - Register a new account or use demo data
   - Try barcode scanning (camera required)
   - Test manual ingredient input
   - Check scan history and profile management

3. **Code changes**
   - Frontend: Edit files in `/client/src/`
   - Backend: Edit files in `/server/`
   - Shared types: Edit `/shared/schema.ts`

### API Development

API routes are organized in `/server/routes/`:
- **Authentication**: `/api/auth/*` - User registration, login, logout
- **Scanning**: `/api/scan/*` - Barcode and manual ingredient analysis
- **User Management**: `/api/users/*` - Profile management
- **Scan History**: `/api/scans` - Historical scan data

## 🔒 Development Security

### Basic Protection
- Input validation with Zod schemas
- Express security headers
- Error handling with structured responses
- Rate limiting on API endpoints

### Development Considerations
- No persistent data storage
- Simplified authentication flow
- In-memory session management
- Basic password hashing for testing

## 🧪 Testing

### Manual Testing

The application includes comprehensive features for testing:

1. **User Registration**: Create new accounts with demo data
2. **Barcode Scanning**: Test with various product barcodes (camera required)
3. **Manual Input**: Enter custom ingredient lists for analysis
4. **Profile Management**: Add/remove allergies and medications
5. **Scan History**: Review past scans and analysis results (stored in SQLite)

### Testing Notes
- **Data Persistence**: All data is saved to SQLite database and persists between server restarts
- **Database Location**: Database file stored in `data/allergy-scan.db`
- **Mock Gemini**: If no API key is provided, mock responses are used
- **Camera Access**: Barcode scanning requires camera permissions
- **Responsive Testing**: Test on different device sizes and orientations

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write descriptive commit messages
- Test features thoroughly before submitting
- Update documentation for new features

## 📋 Development API Reference

### Available Endpoints (Development)

- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - User authentication
- `POST /api/scan/barcode` - Analyze product by barcode
- `POST /api/scan/manual` - Analyze manually entered ingredients
- `GET /api/users/:id` - Get user profile data
- `PUT /api/users/:id` - Update user profile
- `GET /api/scans` - Get user's scan history (in-memory)

## 🐛 Troubleshooting

### Common Issues

**Database Connection Error**
```bash
Error: Connection failed
```
- Check DATABASE_URL environment variable
- Ensure PostgreSQL is running
- Verify network connectivity

**Google Gemini API Error**
```bash
Error: Gemini API request failed
```
- Verify GOOGLE_GEMINI_API_KEY is correct
- Check API usage limits
- Ensure internet connectivity

**Build Errors**
```bash
TypeScript compilation errors
```
- Run `npm run check` to see detailed errors
- Ensure all dependencies are installed
- Check for syntax errors in TypeScript files

### Performance Optimization

- Enable database connection pooling
- Implement Redis caching for frequent queries
- Optimize images and static assets
- Use CDN for global content delivery

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini** for powerful AI analysis capabilities
- **Radix UI** for accessible component primitives
- **Tailwind CSS** for utility-first styling
- **Drizzle ORM** for type-safe database operations
- **React Query** for excellent data fetching and caching

## 📞 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation for common solutions
- Review the troubleshooting section

---

**Built with ❤️ for food safety and allergen awareness**