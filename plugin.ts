import type {Plugin} from '@hey-api/openapi-ts';

function resolveRefs(schema: any, allSchemas: Record<string, any>): any {
    if (!schema) return schema;
    if (schema.$ref) {
        const refPath = schema.$ref.replace('#/components/schemas/', '');
        const resolved = allSchemas[refPath] || allSchemas[`${refPath}Schema`];
        if (!resolved) return schema;
        return resolveRefs(resolved, allSchemas);
    }
    if (schema.properties) {
        for (const key in schema.properties) {
            schema.properties[key] = resolveRefs(schema.properties[key], allSchemas);
        }
    }
    if (schema.items) {
        if (Array.isArray(schema.items)) {
            schema.items = schema.items.map((item: any) => resolveRefs(item, allSchemas));
        } else {
            schema.items = resolveRefs(schema.items, allSchemas);
        }
    }
    if (schema.allOf) {
        schema.allOf = schema.allOf.map((item: any) => resolveRefs(item, allSchemas));
    }
    return schema;
}

function sanitizeMethodName(prop: string) {
    return prop
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
        .replace(/[^a-zA-Z0-9]/g, '')
        .replace(/^(.)/, (m) => m.toUpperCase());
}

export const handler: Plugin.Handler<any> = ({context, plugin}) => {
    const schemas: Record<string, any> = {};
    context.subscribe('schema', ({name, schema}) => {
        if (schema && typeof schema === 'object') {
            schemas[name] = schema;
        }
    });
    context.subscribe('after', () => {
        const file = context.createFile({
            id: plugin.name,
            path: plugin.output,
        });
        let outputContent = 'import { generateMock } from "hey-api-builders";\n';
        outputContent += 'import type * as types from "./types.gen";\n\n';
        for (const [schemaName, schema] of Object.entries(schemas)) {
            if (!schema || typeof schema !== 'object') continue;
            const resolvedSchema = resolveRefs(schema, schemas);
            const typeName = schemaName.replace(/Schema$/, '').trim();
            const builderClassName = `${typeName}Builder`;
            const isEnum = resolvedSchema.type === 'enum';
            const builderOptionsType = `_${builderClassName}Options`;
            outputContent += `
type ${builderOptionsType} = {
  useDefault?: boolean;
  useExamples?: boolean;
  alwaysIncludeOptionals?: boolean;
  optionalsProbability?: number | false;
  omitNulls?: boolean;
};
`;
            if (isEnum) {
                const enumValues = resolvedSchema.items?.map((item: any) => item.const) || [];
                const enumSchema = {
                  ...resolvedSchema,
                  type: 'string',
                  enum: enumValues,
                };
                outputContent += `
export class ${builderClassName} {
  private options: ${builderOptionsType} = {};
  setOptions(options: ${builderOptionsType}) { this.options = options || {}; return this; }
  build(): types.${typeName} {
    return generateMock(${JSON.stringify(enumSchema, null, 2)}, {
      useDefaultValue: this.options.useDefault,
      useExamplesValue: this.options.useExamples,
      alwaysFakeOptionals: this.options.alwaysIncludeOptionals,
      optionalsProbability: this.options.optionalsProbability,
      omitNulls: this.options.omitNulls,
    }) as types.${typeName};
  }
}
export function create${builderClassName}() {
  return new ${builderClassName}();
}
`;
                continue;
            }
            if (resolvedSchema.properties) {
                for (const [prop, propSchemaRaw] of Object.entries(resolvedSchema.properties)) {
                    const propSchema = propSchemaRaw as Record<string, any>;
                    if (propSchema && propSchema["type"] === "enum") {
                        const enumValues = Array.isArray(propSchema["items"])
                            ? propSchema["items"].map((item: any) => item.const)
                            : [];
                        resolvedSchema.properties[prop] = {
                            ...propSchema,
                            type: "string",
                            enum: enumValues,
                        };
                    } else if (
                        propSchema &&
                        Array.isArray(propSchema.items) &&
                        propSchema.logicalOperator === "or"
                    ) {
                        const types = propSchema.items.map((item: any) => item.type).filter(Boolean);
                        if (types.length > 0) {
                            resolvedSchema.properties[prop] = {
                                ...propSchema,
                                type: types.length === 1 ? types[0] : types,
                            };
                            delete resolvedSchema.properties[prop].items;
                            delete resolvedSchema.properties[prop].logicalOperator;
                        } else {
                            resolvedSchema.properties[prop] = {
                                anyOf: propSchema.items,
                            };
                            delete resolvedSchema.properties[prop].items;
                            delete resolvedSchema.properties[prop].logicalOperator;
                        }
                    }
                }
            }
            let withMethods = '';
            if (resolvedSchema.properties) {
                for (const prop of Object.keys(resolvedSchema.properties)) {
                    const methodName = `with${sanitizeMethodName(prop)}`;
                    withMethods += `\n  ${methodName}(value: types.${typeName}[\"${prop}\"]): this {\n    this.overrides[\"${prop}\"] = value;\n    return this;\n  }`;
                }
            }
            outputContent += `
export class ${builderClassName} {
  private overrides: Partial<types.${typeName}> = {};
  private options: ${builderOptionsType} = {};
  setOptions(options: ${builderOptionsType}) { this.options = options || {}; return this; }
  ${withMethods}
  build(): types.${typeName} {
    const mock = generateMock(${JSON.stringify(resolvedSchema, null, 2)}, {
      useDefaultValue: this.options.useDefault,
      useExamplesValue: this.options.useExamples,
      alwaysFakeOptionals: this.options.alwaysIncludeOptionals,
      optionalsProbability: this.options.optionalsProbability,
      omitNulls: this.options.omitNulls,
    }) as types.${typeName};
    return { ...mock, ...this.overrides };
  }
}
export function create${builderClassName}() {
  return new ${builderClassName}();
}
`;
        }
        file.add(outputContent);
    });
};
