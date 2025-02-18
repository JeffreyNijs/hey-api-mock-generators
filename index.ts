import {JSONSchemaFaker} from 'json-schema-faker'

export interface JSFOptions {
    useDefaultValue?: boolean
    useExamplesValue?: boolean
}

export function generateMock(schema: any, options?: JSFOptions): any {
    JSONSchemaFaker.option({
        useDefaultValue: options?.useDefaultValue ?? true,
        useExamplesValue: options?.useExamplesValue ?? true,
    })
    return JSONSchemaFaker.generate(schema)
}

export { defaultConfig, defineConfig } from './config';

