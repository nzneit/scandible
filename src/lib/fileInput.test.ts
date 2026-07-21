import { describe, it, expect } from 'vitest';
import { readUpcFile } from './fileInput';

describe('readUpcFile', () => {
	it('resolves with the file text', async () => {
		const file = new File(['036000291452\n012345678905'], 'codes.txt', { type: 'text/plain' });
		await expect(readUpcFile(file)).resolves.toBe('036000291452\n012345678905');
	});
});
