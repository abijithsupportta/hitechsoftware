# Hi Tech Software - Project Structure

## 📁 **Directory Structure**

```
hitechsoftware/
├── 📁 .github/                     # GitHub workflows and actions
├── 📁 .windsurf/                   # Windsurf IDE configuration
├── 📁 database/                    # Database related files
│   ├── 📁 exports/                 # Database exports and analysis
│   ├── 📁 scripts/                 # Database utility scripts
│   └── 📁 migrations/               # Supabase migrations
├── 📁 doc/                         # All documentation
│   ├── 📄 AGENTS.md                 # Development guidelines
│   ├── 📄 BUGS_AND_ERRORS_LOG.md   # Bug tracking log
│   ├── 📄 BUSINESS_RULES.md         # Business rules documentation
│   ├── 📄 DATABASE_ANALYSIS.md     # Database analysis
│   ├── 📄 DATABASE_COMPLETE_GUIDE.md # Complete database guide
│   ├── 📄 RUNTIME_AND_TYPESCRIPT_ANALYSIS_REPORT.md # Runtime analysis
│   ├── 📄 SENIOR_MIGRATION_REPORT.md # Migration reports
│   ├── 📄 CODE_STRUCTURE_ANALYSIS.md # Code structure analysis
│   └── [other documentation files]
├── 📁 scripts/                     # Utility and test scripts
│   ├── 📁 database/                 # Database utility scripts
│   ├── 📁 seeding/                 # Data seeding scripts
│   ├── 📁 testing/                 # Test scripts
│   └── 📄 [other utility scripts]
├── 📁 web/                         # Next.js web application
├── 📁 hitech_admin/                # Flutter admin app
├── 📁 hitech_technician/           # Flutter technician app
├── 📄 package.json                 # Monorepo configuration
├── 📄 turbo.json                   # Turborepo configuration
├── 📄 .gitignore                   # Git ignore rules
├── 📄 .cursorignore                # Cursor IDE ignore rules
├── 📄 .cursorrules                 # Cursor IDE rules
├── 📄 .windsurfrules               # Windsurf IDE rules
├── 📄 README.md                    # Main project README
└── 📄 vercel.json                  # Vercel deployment config
```

## 🎯 **Component Overview**

### **📁 Database (`/database`)**
- **exports/**: Database exports, schema files, and analysis reports
- **scripts/**: Database utility scripts and extraction tools
- **migrations/**: Supabase migration files

### **📁 Documentation (`/doc`)**
- All project documentation centralized
- Development guidelines and rules
- Database and API documentation
- Analysis and migration reports

### **📁 Scripts (`/scripts`)**
- **database/**: Database-related utility scripts
- **seeding/**: Data seeding and population scripts
- **testing/**: End-to-end and integration tests
- **utility/**: General utility scripts

### **📁 Applications**
- **web/**: Next.js web application (main product)
- **hitech_admin/**: Flutter admin application
- **hitech_technician/**: Flutter technician application

## 📋 **File Naming Conventions**

### **Documentation**
- 📄 `kebab-case.md` for markdown files
- 📄 Descriptive names with clear purpose

### **Scripts**
- 📄 `camelCase.js` for JavaScript files
- 📄 `kebab-case.ps1` for PowerShell scripts
- 📄 `snake_case.sql` for SQL files

### **Configuration**
- 📄 Standard naming (package.json, turbo.json, etc.)
- 📄 Environment-specific files with proper prefixes

## 🔄 **Maintenance Guidelines**

### **Adding New Files**
1. **Documentation**: Place in `/doc` with appropriate categorization
2. **Scripts**: Organize by purpose in `/scripts` subdirectories
3. **Database**: Database files go in `/database`
4. **Temporary**: Use `.gitignore` to exclude temporary files

### **Code Organization**
1. **Single Responsibility**: Each directory has clear purpose
2. **Separation of Concerns**: Database, docs, scripts, apps separated
3. **Easy Navigation**: Logical structure for quick file discovery
4. **Scalability**: Structure supports future growth

### **Clean Repository**
- Root directory contains only essential files
- No temporary or duplicate files
- Clear file naming and organization
- Regular cleanup and maintenance

## 🚀 **Getting Started**

### **Development Setup**
1. Clone repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Run database migrations
5. Start development server: `npm run dev`

### **Database Operations**
```bash
# Run migrations
npx supabase db push

# Extract data
node scripts/database/extract_data.js

# Seed data
node scripts/seeding/seed-data.js
```

### **Testing**
```bash
# Run tests
npm test

# Run specific test suites
node scripts/testing/e2e-full-service.js
```

## 📚 **Documentation Links**

- **Development Guidelines**: `/doc/AGENTS.md`
- **Business Rules**: `/doc/BUSINESS_RULES.md`
- **Database Guide**: `/doc/DATABASE_COMPLETE_GUIDE.md`
- **API Documentation**: `/doc/FRONTEND_DEVELOPER_REFERENCE.md`
- **Deployment Guide**: `/doc/DELIVERY_CHECKLIST.md`

## 🎯 **Best Practices**

### **File Management**
- Keep root directory clean
- Use appropriate directories for file types
- Follow naming conventions consistently
- Remove temporary files promptly

### **Documentation**
- Keep documentation up-to-date
- Use clear and descriptive titles
- Include examples and usage instructions
- Maintain table of contents

### **Scripts**
- Include usage comments
- Handle errors gracefully
- Use appropriate file permissions
- Test scripts before committing

---

**Last Updated**: 2026-03-27  
**Maintainer**: Development Team  
**Version**: 1.0
