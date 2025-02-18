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

        let outputContent = 'import { generateMock } from "hey-api-mock-generators";\n';
        outputContent += 'import type * as types from "./types.gen";\n\n';

        for (const [schemaName, schema] of Object.entries(schemas)) {
            if (!schema || typeof schema !== 'object') continue;

            const resolvedSchema = resolveRefs(schema, schemas);
            const formattedSchemaName = schemaName.replace(/Schema$/, '');
            const mockFunctionName = `${formattedSchemaName}Generator`;
            const returnType = `types.${formattedSchemaName}`;

            outputContent += `export function ${mockFunctionName}(): ${returnType} {
  return generateMock(${JSON.stringify(resolvedSchema, null, 2)}) as ${returnType};
}

`;
        }

        file.add(outputContent);
    });
};
