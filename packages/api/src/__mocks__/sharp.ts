/**
 * Mock implementation of the Sharp image library for testing
 */

export class MockSharpInstance {
    calls: Record<string, Array<Array<unknown>>> = {
        resize: [],
        rotate: [],
        webp: [],
        jpeg: [],
        png: [],
        withMetadata: [],
        toBuffer: [],
        toFile: [],
    };

    toBufferValue: Buffer = Buffer.from('mock-processed-image');

    resize(...args: unknown[]) {
        this.calls.resize.push(args);
        return this;
    }

    rotate(...args: unknown[]) {
        this.calls.rotate.push(args);
        return this;
    }

    webp(...args: unknown[]) {
        this.calls.webp.push(args);
        return this;
    }

    jpeg(...args: unknown[]) {
        this.calls.jpeg.push(args);
        return this;
    }

    png(...args: unknown[]) {
        this.calls.png.push(args);
        return this;
    }

    withMetadata(...args: unknown[]) {
        this.calls.withMetadata.push(args);
        return this;
    }

    async toBuffer() {
        this.calls.toBuffer.push([]);
        return this.toBufferValue;
    }

    async toFile(...args: unknown[]) {
        this.calls.toFile.push(args);
        return { filename: args[0] };
    }

    reset() {
        this.calls = {
            resize: [],
            rotate: [],
            webp: [],
            jpeg: [],
            png: [],
            withMetadata: [],
            toBuffer: [],
            toFile: [],
        };
        this.toBufferValue = Buffer.from('mock-processed-image');
    }
}

export function createMockSharp() {
    const instance = new MockSharpInstance();
    return () => instance;
}

// Default export that returns a Sharp-like interface
export default function sharp(_input: unknown) {
    return new MockSharpInstance();
}
