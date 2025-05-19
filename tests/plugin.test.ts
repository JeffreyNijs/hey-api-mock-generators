import { resolveRefs, handler } from '../plugin';
import { Plugin } from '@hey-api/openapi-ts';

describe('resolveRefs', () => {
  const allSchemas = {
    TestSchema: { type: 'object', properties: { name: { type: 'string' } } },
  };

  it('should resolve references within schemas', () => {
    const schema = { $ref: '#/components/schemas/TestSchema' };
    const resolvedSchema = resolveRefs(schema, allSchemas);

    expect(resolvedSchema).toEqual(allSchemas.TestSchema);
  });

  it('should handle schemas without references', () => {
    const schema = { type: 'object', properties: { age: { type: 'number' } } };
    const resolvedSchema = resolveRefs(schema, allSchemas);

    expect(resolvedSchema).toEqual(schema);
  });

  it('should handle nested references', () => {
    const schema = {
      type: 'object',
      properties: {
        user: { $ref: '#/components/schemas/TestSchema' },
      },
    };
    const resolvedSchema = resolveRefs(schema, allSchemas);

    expect(resolvedSchema).toEqual({
      type: 'object',
      properties: {
        user: allSchemas.TestSchema,
      },
    });
  });
});

describe('handler', () => {
  let context: any;
  let plugin: Plugin<any>;

  beforeEach(() => {
    context = {
      subscribe: jest.fn(),
      createFile: jest.fn().mockReturnValue({
        add: jest.fn(),
      }),
    };
    plugin = {
      name: 'test-plugin',
      output: 'test-output',
    };
  });

  it('should subscribe to schema and after events', () => {
    handler({ context, plugin });

    expect(context.subscribe).toHaveBeenCalledWith('schema', expect.any(Function));
    expect(context.subscribe).toHaveBeenCalledWith('after', expect.any(Function));
  });

  it('should generate output file with resolved schemas', () => {
    const schema = { type: 'object', properties: { name: { type: 'string' } } };
    const schemas = { TestSchema: schema };

    context.subscribe.mockImplementation((event: string, callback: Function) => {
      if (event === 'schema') {
        callback({ name: 'TestSchema', schema });
      } else if (event === 'after') {
        callback();
      }
    });

    handler({ context, plugin });

    const expectedOutput = `
import { generateMock } from "hey-api-builders";
import type * as types from "./types.gen";

export class TestBuilder {
  private overrides: Partial<types.Test> = {};

  
  public withName(value: types.Test["name"]): this {
    this.overrides["name"] = value;
    return this;
  }

  public build(): types.Test {
    const mock = generateMock(${JSON.stringify(schema, null, 2)}) as types.Test;
    return { ...mock, ...this.overrides };
  }
}

export function createTestBuilder() {
  return new TestBuilder();
}
`;

    expect(context.createFile).toHaveBeenCalledWith({
      id: plugin.name,
      path: plugin.output,
    });
    expect(context.createFile().add).toHaveBeenCalledWith(expectedOutput);
  });
});
