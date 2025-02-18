export interface Config {
    /**
     * Plugin name. Must be unique.
     */
    name: '@hey-api/mock-generators',
    /**
     * Name of the generated file.
     *
     * @default 'my-plugin'
     */
    output?: string;
    /**
     * User-configurable option for your plugin.
     *
     * @default false
     */
    myOption?: boolean;
}
