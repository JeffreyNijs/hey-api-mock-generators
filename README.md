# @hey-api/mock-generators

**@hey-api/mock-generators** is a custom plugin for the [Hey API](https://heyapi.dev/openapi-ts/) that generates mock data generators based on your OpenAPI schemas. By leveraging [JSON Schema Faker](https://github.com/json-schema-faker/json-schema-faker), this plugin automates the creation of mock data, facilitating testing and development.

## Features

- **Automated Mock Data Generation:** Creates TypeScript functions that generate mock data for each of your OpenAPI schemas.
- **Seamless Integration:** Designed to work effortlessly with Hey API's existing plugins and workflows.
- **Highly Configurable:** Offers options to tailor the output to your project's specific needs.

## Installation

To include **@hey-api/mock-generators** in your project, follow these steps:

1. **Install the Plugin:**

   ```bash
   npm install @hey-api/mock-generators
   ```

   Alternatively, if you're using Yarn:

   ```bash
   yarn add @hey-api/mock-generators
   ```

2. **Update Your OpenAPI Configuration:**

   In your `openapi.config.ts` file, import and configure the plugin:

   ```typescript
   import { defineConfig } from '@hey-api/openapi-ts';
   import { defineConfig as defineJSFConfig } from '@hey-api/mock-generators';

   export default defineConfig({
     input: 'path/to/your/openapi.yaml',
     output: 'src/client',
     plugins: [
       // Other plugins...
       defineJSFConfig({
         // Optional: plugin-specific configurations
       }),
     ],
   });
   ```

## Usage

Once configured, running the Hey API code generation will produce a file (default: `generators.gen.ts`) containing mock generator functions for your schemas.

```typescript
// Example usage in your code
import { UserGenerator } from './client/generators.gen';

const mockUser = UserGenerator();
console.log(mockUser);
```

Each generator function corresponds to a schema in your OpenAPI specification and returns a mock object adhering to that schema.

## Configuration Options

The plugin accepts the following options:

- **name** (string): The unique name of the plugin. Default is `'@hey-api/mock-generators'`.
- **output** (string): The filename for the generated mock generators. Default is `'generators.gen.ts'`.

These options can be passed when defining the plugin in your configuration:

```typescript
defineJSFConfig({
  output: 'custom-generators.ts',
});
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on the [GitHub repository](https://github.com/yourusername/hey-api-mock-generators).

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

---

By integrating **@hey-api/mock-generators** into your project, you streamline the process of generating mock data, enhancing both development and testing workflows.
