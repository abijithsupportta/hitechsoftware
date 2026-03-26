# Hi Tech Software - Comprehensive Testing Workflow

## 🎯 Testing Checklist (Must Complete After Every Change)

### 1. BUILD TESTING
```bash
# Always run build first
npm run build

# Check for:
- TypeScript errors
- Import/export issues
- Type mismatches
- Missing dependencies
```

### 2. RUNTIME TESTING
```bash
# Start development server
npm run dev

# Test in browser:
- Login functionality
- Dashboard loading
- Navigation between pages
- Form submissions
- API calls
```

### 3. DATABASE TESTING
```bash
# Check database connectivity
npx supabase db query --linked "SELECT 1"

# Test affected tables
npx supabase db query --linked "SELECT COUNT(*) FROM table_name"

# Verify foreign keys
npx supabase db query --linked "SELECT * FROM affected_table LIMIT 5"

# Check RLS policies
npx supabase db query --linked "SELECT * FROM protected_table LIMIT 1"
```

### 4. MODULE-SPECIFIC TESTING

#### User Management Module
- [ ] User registration
- [ ] Login/logout
- [ ] Role-based access
- [ ] Profile updates
- [ ] Permission checks

#### Customer Management Module
- [ ] Customer CRUD operations
- [ ] Address management
- [ ] Search/filter
- [ ] Data validation

#### Service Management Module
- [ ] Subject creation
- [ ] Status transitions
- [ ] Technician assignment
- [ ] Job workflow
- [ ] Photo uploads

#### Inventory Management Module
- [ ] Product CRUD
- [ ] Stock entries
- [ ] Stock balance view
- [ ] Price updates
- [ ] Low stock alerts

#### Digital Bag Module
- [ ] Bag session creation
- [ ] Item issuance
- [ ] Item consumption
- [ ] Session closure
- [ ] Variance calculation

#### Billing Module
- [ ] Bill generation
- [ ] GST calculations
- [ ] Payment modes
- [ ] PDF generation
- [ ] Financial reports

#### AMC Module
- [ ] Contract creation
- [ ] Renewal workflow
- [ ] Expiry tracking
- [ ] Notification system

#### Commission Module
- [ ] Commission configuration
- [ ] Earnings calculation
- [ ] Leaderboard updates
- [ ] Payout processing

### 5. API TESTING
```bash
# Test all API endpoints
curl -X GET http://localhost:3000/api/endpoint
curl -X POST http://localhost:3000/api/endpoint -d "{}"

# Check for:
- 200 status codes
- Proper error handling
- Data validation
- Response format
```

### 6. ERROR HANDLING TESTING
```bash
# Test error scenarios:
- Invalid data input
- Missing required fields
- Permission denied
- Database connection failures
- Network errors
- Concurrent operations
```

### 7. PERFORMANCE TESTING
```bash
# Check:
- Page load times
- API response times
- Database query performance
- Memory usage
- Bundle size
```

### 8. SECURITY TESTING
```bash
# Verify:
- RLS policies working
- Auth checks in place
- SQL injection prevention
- XSS protection
- CORS configuration
```

## 🔄 Testing Workflow

### Before Making Changes
1. [ ] Run `npm run build` - ensure baseline is clean
2. [ ] Run `npm run dev` - ensure server starts
3. [ ] Check database connectivity
4. [ ] Document current functionality

### During Development
1. [ ] Make small, incremental changes
2. [ ] Test each change immediately
3. [ ] Run build after major changes
4. [ ] Check browser console for errors

### After Making Changes
1. [ ] **BUILD TEST**: `npm run build`
   - Fix any TypeScript errors
   - Fix any import issues
   - Ensure clean build

2. [ ] **RUNTIME TEST**: Start dev server
   - Test affected pages
   - Test navigation
   - Test forms and interactions

3. [ ] **DATABASE TEST**: 
   - Test database connectivity
   - Test affected tables
   - Verify data integrity

4. [ ] **MODULE TEST**: Test specific functionality
   - Follow module-specific checklist
   - Test all user workflows
   - Verify business logic

5. [ ] **API TEST**: Test all affected endpoints
   - Test success scenarios
   - Test error scenarios
   - Verify response formats

6. [ ] **INTEGRATION TEST**: Test cross-module functionality
   - Test data flow between modules
   - Test dependent operations
   - Test end-to-end workflows

7. [ ] **REGRESSION TEST**: Test existing functionality
   - Ensure nothing broke
   - Test critical paths
   - Verify user workflows

## 📋 Testing Report Template

### Change Summary
- **Module**: [Module Name]
- **Change**: [Brief description]
- **Files Modified**: [List files]

### Build Test Results
- ✅ Build Status: [PASS/FAIL]
- ❌ Errors Found: [List errors]
- 🔧 Fixes Applied: [List fixes]

### Runtime Test Results
- ✅ Server Starts: [YES/NO]
- ✅ Pages Load: [List pages tested]
- ✅ Navigation Works: [YES/NO]
- ❌ Runtime Errors: [List errors]

### Database Test Results
- ✅ Connectivity: [YES/NO]
- ✅ Tables Affected: [List tables]
- ✅ Data Integrity: [YES/NO]
- ❌ Database Errors: [List errors]

### Module Test Results
- ✅ Functionality: [List features tested]
- ✅ User Workflows: [List workflows]
- ❌ Module Issues: [List issues]

### API Test Results
- ✅ Endpoints Tested: [List endpoints]
- ✅ Response Codes: [List codes]
- ❌ API Issues: [List issues]

### Integration Test Results
- ✅ Cross-Module: [List integrations]
- ✅ Data Flow: [List flows]
- ❌ Integration Issues: [List issues]

### Regression Test Results
- ✅ Existing Features: [List features]
- ✅ Critical Paths: [List paths]
- ❌ Regression Issues: [List issues]

### Final Status
- 🎯 **Ready for Production**: [YES/NO]
- ⚠️ **Known Issues**: [List issues]
- 📝 **Notes**: [Additional notes]

## 🚀 Automated Testing Commands

### Quick Test Suite
```bash
#!/bin/bash
echo "=== QUICK TEST SUITE ==="

# Build test
echo "Testing build..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ BUILD FAILED"
    exit 1
fi
echo "✅ BUILD PASSED"

# Database test
echo "Testing database..."
npx supabase db query --linked "SELECT 1"
if [ $? -ne 0 ]; then
    echo "❌ DATABASE FAILED"
    exit 1
fi
echo "✅ DATABASE PASSED"

# Start server (background)
echo "Starting server..."
npm run dev &
SERVER_PID=$!
sleep 5

# Test API endpoints
echo "Testing API..."
curl -s http://localhost:3000/api/health > /dev/null
if [ $? -ne 0 ]; then
    echo "❌ API FAILED"
    kill $SERVER_PID
    exit 1
fi
echo "✅ API PASSED"

# Stop server
kill $SERVER_PID
echo "✅ ALL TESTS PASSED"
```

### Full Test Suite
```bash
#!/bin/bash
echo "=== FULL TEST SUITE ==="

# Build test
npm run build || exit 1

# Database tests
npx supabase db query --linked "SELECT COUNT(*) FROM profiles"
npx supabase db query --linked "SELECT COUNT(*) FROM subjects"
npx supabase db query --linked "SELECT COUNT(*) FROM inventory_products"

# API tests
curl -X GET http://localhost:3000/api/health
curl -X GET http://localhost:3000/api/users
curl -X GET http://localhost:3000/api/subjects

# Performance tests
npm run build --analyze
```

## 📊 Quality Gates

### Must Pass Before Deployment
- ✅ Clean build (no errors)
- ✅ Database connectivity
- ✅ Core functionality working
- ✅ No critical security issues
- ✅ Performance acceptable

### Should Pass Before Deployment
- ✅ All module tests passing
- ✅ No regression issues
- ✅ Documentation updated
- ✅ Code review completed

## 🎯 Implementation Rules

1. **Test First**: Write tests before code
2. **Test Often**: Test after every change
3. **Test Deeply**: Test all layers (UI, API, DB)
4. **Test Edge Cases**: Test error scenarios
5. **Document Results**: Keep test records
6. **Fix Issues**: Address all test failures
7. **Verify Fixes**: Re-test after fixes

## 📝 Testing Checklist (Copy for Each Change)

```
□ Build test passed
□ Runtime test passed
□ Database test passed
□ Module test passed
□ API test passed
□ Integration test passed
□ Regression test passed
□ Performance acceptable
□ Security verified
□ Documentation updated
□ Ready for production
```

---

**REMEMBER: If any test fails, fix it before proceeding!** 🚀
