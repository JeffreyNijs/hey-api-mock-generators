import { generateMock } from '../index';
import { JSONSchemaFaker } from 'json-schema-faker';

jest.mock('json-schema-faker');

describe('generateMock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should set options and generate mock data', () => {
    const schema = { type: 'object', properties: { name: { type: 'string' } } };
    const mockData = { name: 'John Doe' };

    JSONSchemaFaker.generate.mockReturnValue(mockData);

    const result = generateMock(schema);

    expect(JSONSchemaFaker.option).toHaveBeenCalledWith({
      useDefaultValue: true,
      useExamplesValue: true,
    });
    expect(JSONSchemaFaker.generate).toHaveBeenCalledWith(schema);
    expect(result).toEqual(mockData);
  });

  it('should handle useDefaultValue and useExamplesValue options', () => {
    const schema = { type: 'object', properties: { name: { type: 'string' } } };
    const options = { useDefaultValue: false, useExamplesValue: false };
    const mockData = { name: 'John Doe' };

    JSONSchemaFaker.generate.mockReturnValue(mockData);

    const result = generateMock(schema, options);

    expect(JSONSchemaFaker.option).toHaveBeenCalledWith(options);
    expect(JSONSchemaFaker.generate).toHaveBeenCalledWith(schema);
    expect(result).toEqual(mockData);
  });
});
