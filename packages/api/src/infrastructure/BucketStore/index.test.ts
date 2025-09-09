import { ObjectStoreConnection } from '@igor-siergiej/api-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BucketStore } from './index';

const mockObjectStore = {
    getHeadObject: vi.fn(),
    getObjectStream: vi.fn(),
    putObject: vi.fn()
};

const mockConnection = mockObjectStore as unknown as ObjectStoreConnection;

describe('BucketStore', () => {
    let bucketStore: BucketStore;

    beforeEach(() => {
        vi.clearAllMocks();
        bucketStore = new BucketStore(mockConnection);
    });

    describe('Getting object metadata', () => {
        describe('When an object exists', () => {
            it('should return the object metadata', async () => {
                const mockStat = {
                    metaData: {
                        'content-type': 'image/png'
                    }
                };

                mockObjectStore.getHeadObject.mockResolvedValue(mockStat);

                const result = await bucketStore.getHeadObject('test-image.png');

                expect(mockObjectStore.getHeadObject).toHaveBeenCalledWith('test-image.png');
                expect(result).toEqual(mockStat);
            });
        });

        describe('When an object does not exist', () => {
            it('should throw the error', async () => {
                mockObjectStore.getHeadObject.mockRejectedValue({ code: 'NotFound' });

                await expect(bucketStore.getHeadObject('non-existent.png'))
                    .rejects.toEqual({ code: 'NotFound' });
            });
        });

        describe('When an error occurs', () => {
            it('should throw the error', async () => {
                mockObjectStore.getHeadObject.mockRejectedValue(new Error('Access denied'));

                await expect(bucketStore.getHeadObject('test-image.png'))
                    .rejects.toThrow('Access denied');
            });
        });
    });

    describe('Getting object stream', () => {
        describe('When getting an object stream', () => {
            it('should return a readable stream', async () => {
                const mockStream = {
                    pipe: vi.fn(),
                    on: vi.fn()
                };

                mockObjectStore.getObjectStream.mockReturnValue(mockStream);

                const result = await bucketStore.getObjectStream('test-image.png');

                expect(mockObjectStore.getObjectStream).toHaveBeenCalledWith('test-image.png');
                expect(result).toBe(mockStream);
            });
        });
    });

    describe('Uploading objects', () => {
        describe('When uploading an object with options', () => {
            it('should upload the object successfully', async () => {
                const mockBuffer = Buffer.from('test-data');
                const options = { contentType: 'image/png' };

                mockObjectStore.putObject.mockResolvedValue(undefined);

                await bucketStore.putObject('test-image.png', mockBuffer, options);

                expect(mockObjectStore.putObject).toHaveBeenCalledWith(
                    'test-image.png',
                    mockBuffer,
                    options
                );
            });
        });

        describe('When uploading an object without options', () => {
            it('should upload the object successfully', async () => {
                const mockBuffer = Buffer.from('test-data');

                mockObjectStore.putObject.mockResolvedValue(undefined);

                await bucketStore.putObject('test-image.png', mockBuffer);

                expect(mockObjectStore.putObject).toHaveBeenCalledWith(
                    'test-image.png',
                    mockBuffer,
                    undefined
                );
            });
        });

        describe('When upload fails', () => {
            it('should throw the error', async () => {
                const mockBuffer = Buffer.from('test-data');

                mockObjectStore.putObject.mockRejectedValue(new Error('Upload failed'));

                await expect(bucketStore.putObject('test-image.png', mockBuffer))
                    .rejects.toThrow('Upload failed');
            });
        });

        describe('When working without logger', () => {
            it('should work without logger', async () => {
                const storeWithoutLogger = new BucketStore(mockConnection);
                const mockBuffer = Buffer.from('test-data');

                mockObjectStore.putObject.mockResolvedValue(undefined);

                await storeWithoutLogger.putObject('test-image.png', mockBuffer);

                expect(mockObjectStore.putObject).toHaveBeenCalledWith(
                    'test-image.png',
                    mockBuffer,
                    undefined
                );
            });
        });
    });
});
