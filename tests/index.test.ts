import { generateMock } from '../index';

describe('generateMock', () => {
  it('generates mock data for a simple schema', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string', default: 'John' },
        age: { type: 'integer', minimum: 18, maximum: 99 }
      },
      required: ['name', 'age']
    };
    const mock = generateMock(schema);
    expect(typeof mock.name).toBe('string');
    expect(typeof mock.age).toBe('number');
    expect(mock.name).toBe('John');
  });

  it('respects useDefaultValue option', () => {
    const schema = {
      type: 'object',
      properties: {
        foo: { type: 'string', default: 'bar' }
      }
    };
    const mock = generateMock(schema, { useDefaultValue: false });
    expect(mock.foo).not.toBeUndefined();
  });

  it('respects useExamplesValue option', () => {
    const schema = {
      type: 'object',
      properties: {
        foo: { type: 'string', examples: ['baz'] }
      }
    };
    const mock = generateMock(schema, { useExamplesValue: true });
    expect(typeof mock.foo).toBe('string');
  });

  it('handles array schemas', () => {
    const schema = {
      type: 'array',
      items: { type: 'integer' }
    };
    const mock = generateMock(schema);
    expect(Array.isArray(mock)).toBe(true);
    expect(typeof mock[0]).toBe('number');
  });
});
