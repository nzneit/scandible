import { describe, it, expect } from 'vitest';
import { readCodesFile } from './fileInput';

describe('readCodesFile', () => {
	it('resolves with the file text', async () => {
		const file = new File(['036000291452\n012345678905'], 'codes.txt', { type: 'text/plain' });
		await expect(readCodesFile(file)).resolves.toBe('036000291452\n012345678905');
	});
});
