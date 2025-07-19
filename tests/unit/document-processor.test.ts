import { describe, it, expect } from 'vitest';
import { isValidFileType, formatFileSize } from '$lib/utils/document-processor';

describe('Document Processor Utils', () => {
  // Tests file type validation for supported formats
  it('should validate file types correctly', () => {
    const validFile = new File(['content'], 'test.txt', { type: 'text/plain' });
    const invalidFile = new File(['content'], 'test.exe', { type: 'application/exe' });

    expect(isValidFileType(validFile)).toBe(true);
    expect(isValidFileType(invalidFile)).toBe(false);
  });

  // Tests byte-to-human-readable size conversion
  it('should format file sizes correctly', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
  });
});
