import type {Plugin} from "@hey-api/openapi-ts";
import {Config} from "./types";
import {handler} from "./plugin";

export const defaultConfig: Plugin.Config<Config> = {
    _dependencies: [],
    _handler: handler,
    _handlerLegacy: () => {
    },
    name: 'hey-api-mock-generators',
    output: 'generators',
}

export const defineConfig: Plugin.DefineConfig<Config> = (config) => ({
    ...defaultConfig,
    ...config,
});
