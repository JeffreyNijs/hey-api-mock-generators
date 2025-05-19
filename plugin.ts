import type {Plugin} from '@hey-api/openapi-ts';

function resolveRefs(schema: any, allSchemas: Record<string, any>): any {
    if (!schema) return schema;

    if (schema.$ref) {
        const refPath = schema.$ref.replace('#/components/schemas/', '');
        const resolved = allSchemas[refPath] || allSchemas[`${refPath}Schema`];
        if (!resolved) {
            console.warn(`Reference not found for ${schema.$ref}`);
            return schema;
        }
        return resolveRefs(resolved, allSchemas);
    }

    if (schema.properties) {
        for (const key in schema.properties) {
            schema.properties[key] = resolveRefs(schema.properties[key], allSchemas);
        }
    }
    if (schema.items) {
        schema.items = resolveRefs(schema.items, allSchemas);
    }
    if (schema.allOf) {
        schema.allOf = schema.allOf.map((item: any) => resolveRefs(item, allSchemas));
    }
    return schema;
}

function toPascalCase(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
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
            const typeName = schemaName.replace(/Schema$/, '');
            const builderClassName = `${typeName}Builder`;

            let withMethods = '';
            if (resolvedSchema.properties) {
                for (const prop of Object.keys(resolvedSchema.properties)) {
                    const methodName = `with${toPascalCase(prop)}`;
                    withMethods += `
  public ${methodName}(value: types.${typeName}["${prop}"]): this {
    this.overrides["${prop}"] = value;
    return this;
  }
`;
                }
            }

            outputContent += `
export class ${builderClassName} {
  private overrides: Partial<types.${typeName}> = {};

  ${withMethods}
  public build(): types.${typeName} {
    const mock = generateMock(${JSON.stringify(resolvedSchema, null, 2)}) as types.${typeName};
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
