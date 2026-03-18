/**
 * Test utilities for Bun test runner
 * Provides mock function capabilities similar to Vitest
 */

export interface MockFunction<T extends (...args: any[]) => any> {
    (...args: Parameters<T>): ReturnType<T>;
    mock: {
        calls: Array<Parameters<T>>;
        results: Array<{ value?: any; error?: Error }>;
        lastCall?: Parameters<T>;
    };
    mockResolvedValue(value: Awaited<ReturnType<T>>): MockFunction<T>;
    mockRejectedValue(error: Error): MockFunction<T>;
    mockReturnValue(value: ReturnType<T>): MockFunction<T>;
    mockImplementation(impl: T): MockFunction<T>;
    mockClear(): void;
}

export function createMockFn<T extends (...args: any[]) => any>(impl?: T): MockFunction<T> {
    let implementation = impl;
    let resolvedValue: any;
    let rejectedError: Error | null = null;
    let returnValue: any;

    const mockData = {
        calls: [] as Array<Parameters<T>>,
        results: [] as Array<{ value?: any; error?: Error }>,
    };

    const fn = ((...args: Parameters<T>) => {
        mockData.calls.push(args);
        mockData.lastCall = args;

        try {
            if (implementation) {
                const result = implementation(...args);
                mockData.results.push({ value: result });
                return result;
            }
            if (rejectedError) {
                throw rejectedError;
            }
            if (resolvedValue !== undefined) {
                return Promise.resolve(resolvedValue);
            }
            if (returnValue !== undefined) {
                return returnValue;
            }
            return undefined;
        } catch (error) {
            mockData.results.push({ error: error as Error });
            throw error;
        }
    }) as MockFunction<T>;

    fn.mock = mockData as any;
    fn.mock.lastCall = undefined;

    fn.mockResolvedValue = (value: Awaited<ReturnType<T>>) => {
        resolvedValue = value;
        implementation = undefined;
        return fn;
    };

    fn.mockRejectedValue = (error: Error) => {
        rejectedError = error;
        return fn;
    };

    fn.mockReturnValue = (value: ReturnType<T>) => {
        returnValue = value;
        rejectedError = null;
        return fn;
    };

    fn.mockImplementation = (impl: T) => {
        implementation = impl;
        return fn;
    };

    fn.mockClear = () => {
        mockData.calls = [];
        mockData.results = [];
        mockData.lastCall = undefined;
    };

    return fn;
}

export function fn<T extends (...args: any[]) => any = () => void>(impl?: T): MockFunction<T> {
    return createMockFn(impl);
}

/**
 * Helper to check if a mock function was called with specific arguments
 */
export function toHaveBeenCalledWith(mockFn: MockFunction<any>, ...expectedArgs: any[]) {
    const calls = mockFn.mock.calls;
    const found = calls.some((call) => {
        if (call.length !== expectedArgs.length) return false;
        return call.every((arg, i) => {
            const expected = expectedArgs[i];
            return deepEqual(arg, expected);
        });
    });
    return found;
}

function deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== 'object' || typeof b !== 'object') return false;

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    return keysA.every((key) => deepEqual(a[key], b[key]));
}
