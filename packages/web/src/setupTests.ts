import { expect, vi } from 'vitest';
import createFetchMock from 'vitest-fetch-mock';
import matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

const fetchMocker = createFetchMock(vi);

fetchMocker.enableMocks();
