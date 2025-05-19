import type { Plugin } from "@hey-api/openapi-ts";
import { Config } from "./types";
import { handler } from "./plugin";

export const defaultConfig: Plugin.Config<Config> = {
    _dependencies: ['@hey-api/schemas', '@hey-api/typescript'],
    _handler: handler as Plugin.Handler<Config>,
    _handlerLegacy: () => {},
    name: 'hey-api-builders',
    output: 'builders',
    exportFromIndex: true,
};

export const defineConfig: Plugin.DefineConfig<Config> = (config) => ({
    ...defaultConfig,
    ...config,
});
