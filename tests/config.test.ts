import { defaultConfig, defineConfig } from '../config';

describe('defaultConfig', () => {
  it('should have the correct default values', () => {
    expect(defaultConfig).toEqual({
      _dependencies: ['@hey-api/schemas', '@hey-api/typescript'],
      _handler: expect.any(Function),
      _handlerLegacy: expect.any(Function),
      name: 'hey-api-builders',
      output: 'builders',
      exportFromIndex: true,
    });
  });
});

describe('defineConfig', () => {
  it('should merge defaultConfig with provided config', () => {
    const customConfig = { output: 'custom-builders' };
    const result = defineConfig(customConfig);

    expect(result).toEqual({
      _dependencies: ['@hey-api/schemas', '@hey-api/typescript'],
      _handler: expect.any(Function),
      _handlerLegacy: expect.any(Function),
      name: 'hey-api-builders',
      output: 'custom-builders',
      exportFromIndex: true,
    });
  });

  it('should override default values with provided config', () => {
    const customConfig = { name: 'custom-name', exportFromIndex: false };
    const result = defineConfig(customConfig);

    expect(result).toEqual({
      _dependencies: ['@hey-api/schemas', '@hey-api/typescript'],
      _handler: expect.any(Function),
      _handlerLegacy: expect.any(Function),
      name: 'custom-name',
      output: 'builders',
      exportFromIndex: false,
    });
  });
});
