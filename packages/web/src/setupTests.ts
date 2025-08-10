import matchers from '@testing-library/jest-dom/matchers';
import { expect, vi } from 'vitest';
import createFetchMock from 'vitest-fetch-mock';

expect.extend(matchers);

const fetchMocker = createFetchMock(vi);

fetchMocker.enableMocks();
