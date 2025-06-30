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

function getBuilderOptionsType(builderClassName: string) {
    return `_${builderClassName}Options`;
}

function getBuilderOptionsTypeDef(builderOptionsType: string) {
    return `type ${builderOptionsType} = {\n  useDefault?: boolean;\n  useExamples?: boolean;\n  alwaysIncludeOptionals?: boolean;\n  optionalsProbability?: number | false;\n  omitNulls?: boolean;\n};\n`;
}

function generateEnumBuilderClass(typeName: string, builderClassName: string, builderOptionsType: string, resolvedSchema: any) {
    const enumValues = resolvedSchema.items?.map((item: any) => item.const) || [];
    const enumSchema = {
        ...resolvedSchema,
        type: 'string',
        enum: enumValues,
    };
    return `
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
`;
}

function generateWithMethods(resolvedSchema: any, typeName: string) {
    if (!resolvedSchema.properties) return '';
    return Object.keys(resolvedSchema.properties)
        .map((prop) => {
            const methodName = `with${sanitizeMethodName(prop)}`;
            return `  ${methodName}(value: types.${typeName}[\"${prop}\"]): this {\n    this.overrides[\"${prop}\"] = value;\n    return this;\n  }`;
        })
        .join('\n');
}

function generateObjectBuilderClass(typeName: string, builderClassName: string, builderOptionsType: string, resolvedSchema: any) {
    const withMethods = generateWithMethods(resolvedSchema, typeName);
    return `
export class ${builderClassName} {
  private overrides: Partial<types.${typeName}> = {};
  private options: ${builderOptionsType} = {};
  setOptions(options: ${builderOptionsType}) { this.options = options || {}; return this; }
${withMethods ? withMethods + '\n' : ''}  build(): types.${typeName} {
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
`;
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
            const builderOptionsType = getBuilderOptionsType(builderClassName);
            outputContent += getBuilderOptionsTypeDef(builderOptionsType);
            if (isEnum) {
                outputContent += generateEnumBuilderClass(typeName, builderClassName, builderOptionsType, resolvedSchema);
            } else {
                // Clean up enum/union properties for object schemas
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
                outputContent += generateObjectBuilderClass(typeName, builderClassName, builderOptionsType, resolvedSchema);
            }
        }
        file.add(outputContent);
    });
};
