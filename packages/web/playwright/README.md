# Shoppingo Web Testing Guide

This directory contains comprehensive tests for the Shoppingo web application using a hybrid testing approach.

## Testing Strategy

### **Hybrid Approach: Playwright E2E + Strategic Unit Tests**

We use **Playwright for E2E testing** and **Vitest for unit testing** utility functions. This approach provides:

- **E2E Tests**: Test complete user flows with real browser interactions
- **Unit Tests**: Test pure functions and utilities in isolation
- **Dynamic API Mocking**: Each test can mock different API responses
- **Mobile Testing**: Cross-device compatibility testing

## Test Structure

```
tests/
├── setup/
│   ├── test-data.ts          # Mock data and fixtures
│   ├── api-mocks.ts          # Dynamic API mocking utilities
│   └── test-helpers.ts       # Reusable test helper functions
├── unit/
│   ├── utils.test.ts         # JWT utility functions
│   └── api.test.ts           # API function unit tests
├── auth.spec.ts              # Authentication E2E tests
├── lists.spec.ts             # Lists management E2E tests
├── items.spec.ts             # Items management E2E tests
├── mobile.spec.ts            # Mobile experience E2E tests
└── README.md                 # This file
```

## Running Tests

### Unit Tests
```bash
# Run all unit tests
npm run test:unit

# Run unit tests with coverage
npm run test
```

### E2E Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in headed mode (see browser)
npm run test:e2e:headed

# Run specific test file
npx playwright test auth.spec.ts
```

### All Tests
```bash
# Run both unit and E2E tests
npm run test:all
```

## Test Data and Mocking

### Test Data (`setup/test-data.ts`)
Contains mock data for:
- Users and authentication
- Lists and items
- API responses

### API Mocking (`setup/api-mocks.ts`)
Dynamic API mocking that allows each test to:
- Mock different API responses
- Simulate network errors
- Test slow responses
- Override specific endpoints

### Test Helpers (`setup/test-helpers.ts`)
Reusable functions for:
- Authentication flows
- List and item operations
- Navigation and interactions
- Assertions and expectations

## Writing Tests

### E2E Test Example
```typescript
import { test, expect } from '@playwright/test';
import { TestHelpers } from './setup/test-helpers';

test.describe('Lists Management', () => {
    let helpers: TestHelpers;

    test.beforeEach(async ({ page }) => {
        helpers = new TestHelpers(page);
        await helpers.setupMocks();
        await helpers.login();
    });

    test('should allow user to create a new list', async ({ page }) => {
        await page.goto('/lists');
        
        await page.click('[data-testid="add-list-button"]');
        await page.fill('[data-testid="list-title-input"]', 'New List');
        await page.click('[data-testid="create-list-button"]');
        
        await expect(page.locator('[data-testid="list-New List"]')).toBeVisible();
    });
});
```

### Unit Test Example
```typescript
import { describe, it, expect } from 'vitest';
import { decodeJWT } from '../../src/utils/jwtUtils';

describe('JWT Utils', () => {
    it('should decode valid JWT token', () => {
        const token = 'valid.jwt.token';
        const decoded = decodeJWT(token);
        
        expect(decoded).toEqual({
            username: 'testuser',
            id: 'user-1',
            exp: 1700000000,
            iat: 1699996400,
        });
    });
});
```

## Test Data Attributes

Add `data-testid` attributes to your components for reliable testing:

```tsx
<button data-testid="add-list-button">Add List</button>
<input data-testid="list-title-input" />
<div data-testid="list-Grocery List">Grocery List</div>
```

## Best Practices

### E2E Tests
1. **Test user flows, not implementation details**
2. **Use data-testid attributes for reliable selectors**
3. **Mock API responses for consistent test data**
4. **Test error scenarios and edge cases**
5. **Include mobile and accessibility testing**

### Unit Tests
1. **Test pure functions and utilities**
2. **Mock external dependencies**
3. **Test edge cases and error conditions**
4. **Keep tests fast and isolated**

### API Mocking
1. **Mock at the network level for realistic testing**
2. **Use dynamic mocking for different test scenarios**
3. **Test both success and error responses**
4. **Simulate network conditions (slow, offline)**

## Continuous Integration

The tests are designed to run in CI environments:
- Playwright tests run in headless mode
- Unit tests run with coverage reporting
- Tests are parallelized for speed
- Screenshots and videos are captured on failure

## Debugging Tests

### E2E Debugging
```bash
# Run with debug mode
npx playwright test --debug

# Run specific test with debug
npx playwright test auth.spec.ts --debug

# Open test results
npx playwright show-report
```

### Unit Test Debugging
```bash
# Run with verbose output
npm run test:unit -- --reporter=verbose

# Run specific test file
npm run test:unit -- utils.test.ts
```

## Coverage

Unit tests provide code coverage for:
- Utility functions (JWT, API helpers)
- Pure business logic
- Error handling

E2E tests provide coverage for:
- User interactions
- Integration between components
- Real-world usage scenarios

## Mobile Testing

Mobile tests verify:
- Touch interactions
- Responsive design
- Mobile-specific UI elements
- Performance on mobile devices
- Orientation changes

## Future Enhancements

Consider adding:
- Visual regression testing
- Performance testing
- Accessibility testing
- Cross-browser testing
- API contract testing
