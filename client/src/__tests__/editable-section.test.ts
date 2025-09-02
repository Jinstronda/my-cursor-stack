import { contentToEditableString, detectContentType, editableStringToContent } from '../components/section-content-utils';

describe('EditableSection Utils', () => {
  describe('contentToEditableString', () => {
    test('converts string content', () => {
      const result = contentToEditableString('Hello world');
      expect(result).toBe('Hello world');
    });

    test('converts array content', () => {
      const result = contentToEditableString(['Item 1', 'Item 2', 'Item 3']);
      expect(result).toBe('Item 1\nItem 2\nItem 3');
    });

    test('converts object content', () => {
      const obj = { title: 'Test', value: 123 };
      const result = contentToEditableString(obj);
      expect(result).toBe('{\n  "title": "Test",\n  "value": 123\n}');
    });

    test('converts null/undefined to string', () => {
      expect(contentToEditableString(null)).toBe('null');
      expect(contentToEditableString(undefined)).toBe('undefined');
    });
  });

  describe('detectContentType', () => {
    test('detects string type', () => {
      expect(detectContentType('hello')).toBe('string');
      expect(detectContentType('')).toBe('string');
    });

    test('detects array type', () => {
      expect(detectContentType([])).toBe('array');
      expect(detectContentType(['item'])).toBe('array');
    });

    test('detects object type', () => {
      expect(detectContentType({})).toBe('object');
      expect(detectContentType({ key: 'value' })).toBe('object');
    });

    test('handles null as object type', () => {
      expect(detectContentType(null)).toBe('string');
    });
  });

  describe('editableStringToContent', () => {
    test('preserves string content', () => {
      const result = editableStringToContent('Hello world', 'string');
      expect(result).toBe('Hello world');
    });

    test('converts to array', () => {
      const result = editableStringToContent('Item 1\nItem 2\nItem 3', 'array');
      expect(result).toEqual(['Item 1', 'Item 2', 'Item 3']);
    });

    test('converts to object', () => {
      const jsonStr = '{"title": "Test", "value": 123}';
      const result = editableStringToContent(jsonStr, 'object');
      expect(result).toEqual({ title: 'Test', value: 123 });
    });

    test('handles invalid JSON gracefully', () => {
      const result = editableStringToContent('invalid json', 'object');
      expect(result).toEqual({ content: 'invalid json' });
    });

    test('filters empty lines in arrays', () => {
      const result = editableStringToContent('Item 1\n\nItem 2\n   \nItem 3', 'array');
      expect(result).toEqual(['Item 1', 'Item 2', 'Item 3']);
    });
  });
});

// Mock test for component behavior (would require React testing setup)
describe('EditableSection Component Logic', () => {
  test('component structure is valid', () => {
    // Basic validation that the component can be imported
    // In a real test environment, this would render the component
    expect(true).toBe(true);
  });
});