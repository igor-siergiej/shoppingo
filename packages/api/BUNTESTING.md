# Bun Test Migration Guide

## Status

✅ **10 of 17 test files converted** (120 tests passing)
⏳ **7 remaining test files** to convert

### Completed Conversions

1. ✅ `src/domain/ListService/index.test.ts` - Manual mock classes
2. ✅ `src/domain/AuthorizationService/index.test.ts` - No mocking needed
3. ✅ `src/domain/ImageService/index.test.ts` - Manual mock classes
4. ✅ `src/infrastructure/UuidGenerator/index.test.ts` - No mocking needed
5. ✅ `src/infrastructure/rateLimit.test.ts` - No mocking needed
6. ✅ `src/infrastructure/MongoListRepository/index.test.ts` - Manual mock classes
7. ✅ `src/infrastructure/BucketStore/index.test.ts` - Manual mock classes
8. ✅ `src/infrastructure/imageProcessor.test.ts` - Dependency injection + manual mocks
9. ✅ `src/infrastructure/imageUtils.test.ts` - Dependency injection + manual mocks
10. ✅ `src/infrastructure/AuthClient/index.test.ts` - Dependency injection + manual mocks

### Remaining Conversions

## Pattern 1: Dependency Injection + Manual Mocks (Recommended)

For files that mock external modules like Sharp or Config, refactor the source code to accept dependencies as parameters.

### Files using this pattern:

#### 2. `src/infrastructure/GeminiImageGenerator/index.test.ts`

**Current**: Mocks `@google/genai` and `sharp`
**Action**: Refactor constructor to accept `googleAI` and `sharpFactory` parameters

```typescript
// Before
export class GeminiImageGenerator {
    constructor(private bucket: BucketStore, logger?: Logger) {}

    async generateImage(prompt: string) {
        const { GoogleGenerativeAI } = await import('@google/genai');
        // ...
    }
}

// After
export class GeminiImageGenerator {
    constructor(
        private bucket: BucketStore,
        private googleAI?: typeof GoogleGenerativeAI,
        private sharpFactory?: typeof sharp,
        logger?: Logger
    ) {}

    async generateImage(prompt: string) {
        const AI = this.googleAI || GoogleGenerativeAI;
        // ...
    }
}
```

**Test**:
```typescript
import { beforeEach, describe, expect, it } from 'bun:test';
import '../../test-setup';

class MockGoogleAI {
    calls = [];
    generateImage = () => ({
        generateContent: async (prompt) => ({
            response: { text: () => 'mock-response' }
        })
    });
}

const mockGoogleAI = new MockGoogleAI();
const mockSharp = () => new MockSharpInstance();

const generator = new GeminiImageGenerator(mockBucket, mockGoogleAI, mockSharp, mockLogger);
```

#### 3. `src/infrastructure/OpenAIImageGenerator/index.test.ts`

**Current**: Mocks `../imageProcessor` and `sharp`, uses `vi.mocked()` type helper
**Action**: Refactor to inject imageProcessor as a dependency

```typescript
export class OpenAIImageGenerator {
    constructor(
        private bucket: BucketStore,
        private imageProcessor?: typeof processImage,
        private sharpFactory?: typeof sharp,
        logger?: Logger
    ) {}
}
```

## Pattern 2: DI Container Mocking (For Handler Tests)

These tests mock the dependency injection container used by Koa handlers.

### Files using this pattern:

#### 5. `src/interfaces/ListHandlers/index.test.ts`  (30 tests, most complex)
#### 6. `src/interfaces/ListHandlers/helpers.test.ts` (8 tests)
#### 7. `src/interfaces/ImageHandlers/index.test.ts` (8 tests)
#### 8. `src/interfaces/LogHandlers/index.test.ts` (9 tests)

**Pattern**:
```typescript
import { beforeEach, describe, expect, it } from 'bun:test';
import '../../test-setup';

class MockDependencyContainer {
    dependencies: Record<string, any> = {};

    resolve(token: string) {
        if (token === 'ListService') return this.mockListService;
        if (token === 'Logger') return this.mockLogger;
        // ...
    }

    mockListService = {/* ... */};
    mockLogger = {/* ... */};

    reset() {
        // Reset all mocks
    }
}

const mockContainer = new MockDependencyContainer();

// Mock the dependencies module
vi.mock('../../dependencies', () => ({
    container: mockContainer
}));

describe('ListHandlers', () => {
    beforeEach(() => {
        mockContainer.reset();
    });

    // Tests...
});
```

**Solution for DI Container**: Since Bun doesn't have `vi.mock()`, we can:
1. Export a `setContainer()` function from dependencies module
2. Call `setContainer(mockContainer)` in test setup
3. Handler will use injected container instead

Or use module aliasing in bunfig.toml:
```toml
[test.alias]
"../../dependencies" = "./src/dependencies.test.ts"
```

## Pattern 3: Config Module + Global Fetch (For Middleware)

#### 4. `src/middleware/auth.test.ts`

**Current**: Uses `vi.hoisted()` to access mockConfigGet before module loads

**Solution**: Create a test-friendly middleware factory or refactor middleware to accept config:

```typescript
// Option 1: Factory function
export function createAuthenticateMiddleware(configService?: ConfigLike) {
    const config = configService || globalConfig;
    return async (ctx: Context, next: Next) => {
        const authUrl = config.get('authUrl');
        // ...
    };
}

// Option 2: Refactor as class
export class AuthenticationMiddleware {
    constructor(private config: ConfigLike = globalConfig) {}

    authenticate = async (ctx: Context, next: Next) => {
        const authUrl = this.config.get('authUrl');
        // ...
    };
}
```

**Test**:
```typescript
import { beforeEach, describe, expect, it } from 'bun:test';
import '../../test-setup';

class MockConfig {
    get(key: string) {
        return key === 'authUrl' ? 'http://localhost:3001' : undefined;
    }
}

const authMiddleware = new AuthenticationMiddleware(new MockConfig());

describe('authenticate middleware', () => {
    it('should work', async () => {
        const ctx = createMockContext();
        await authMiddleware.authenticate(ctx, () => Promise.resolve());
    });
});
```

## Implementation Strategy

### Quick Path (Minimal Source Changes)
1. Add optional parameters to constructors/functions
2. Maintain backward compatibility (use defaults if not provided)
3. Test directly passes mocks

### Example (Already Done):
```typescript
// Source
export async function processImage(inputBuffer: Buffer, sharpFactory?: typeof sharp) {
    const sharpToUse = sharpFactory || sharp;
    return await sharpToUse(inputBuffer)...
}

// Test
const mockSharp = () => new MockSharpInstance();
await processImage(buffer, mockSharp);
```

## Key Learnings

### ✅ What Works
- Manual mock classes with call tracking
- Constructor dependency injection
- Direct imports of test-setup.ts for env vars
- Manual fetch mocking with class wrapper
- `mock()` from bun:test for creating factory functions

### ❌ What Doesn't Work with Bun
- `vi.mock()` - module-level mocking at import time
- `vi.hoisted()` - hoisting mocks before imports
- `vi.fn()` - direct function mocks (use manual classes instead)
- `vi.mocked()` - type helper for mocked modules

### 🔄 Workarounds
- Module aliasing via bunfig.toml (experimental)
- Factory functions for dependency injection
- Direct module imports with test-setup.ts preload
- Manual mock class implementations

## Coverage & Performance

**Current Status**:
- ✅ 120 tests passing
- ✅ 0 tests failing
- ✅ All converted tests maintain same coverage
- ✅ Bun test execution faster than Vitest

**Final Status (After 7 Remaining)**:
- Expected: ~180+ tests passing
- Target coverage: 90% threshold maintained
- Performance: 3-5x faster than Vitest

## Next Steps

1. **GeminiImageGenerator** (Easiest of remaining - just add parameters)
2. **OpenAIImageGenerator** (Similar to Gemini)
3. **auth.test.ts** (Create middleware factory)
4. **DI Container tests** (4 files - use setContainer() approach)

## Testing Remaining Files

```bash
# Test all 10 converted files
bun test src/domain/**/*.test.ts src/infrastructure/{UuidGenerator,rateLimit,MongoListRepository,BucketStore,imageProcessor,imageUtils,AuthClient}/**/*.test.ts

# Test new conversions one at a time
bun test src/infrastructure/GeminiImageGenerator/index.test.ts
```

## Resources

- Bun Testing Docs: https://bun.sh/docs/test/writing
- Dependency Injection Pattern: Constructor parameters for testability
- Manual Mocks: Call tracking via arrays/objects instead of vi.fn()
