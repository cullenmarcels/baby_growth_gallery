import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const document = JSON.parse(await readFile(new URL('../openapi.json', import.meta.url), 'utf8'));

function typeForSchema(schema, indent = '      ') {
  if (!schema) return 'unknown';
  if (schema.$ref) {
    const name = schema.$ref.split('/').at(-1);
    return `components['schemas']['${name}']`;
  }
  if (schema.enum) return schema.enum.map((value) => JSON.stringify(value)).join(' | ');
  if (schema.type === 'array') return `Array<${typeForSchema(schema.items, indent)}>`;
  if (schema.type === 'object' || schema.properties) {
    const required = new Set(schema.required ?? []);
    const properties = Object.entries(schema.properties ?? {})
      .sort(([left], [right]) => left.localeCompare(right))
      .map(
        ([name, child]) =>
          `${indent}${JSON.stringify(name)}${required.has(name) ? '' : '?'}: ${typeForSchema(child, `${indent}  `)};`,
      );
    return `{\n${properties.join('\n')}\n${indent.slice(2)}}`;
  }
  if (schema.type === 'integer' || schema.type === 'number') return 'number';
  if (schema.type === 'boolean') return 'boolean';
  if (schema.type === 'string') return 'string';
  return 'unknown';
}

function responseType(response, indent) {
  const content = response.content ?? {};
  const entries = Object.entries(content)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([mediaType, media]) =>
        `${indent}${JSON.stringify(mediaType)}: ${typeForSchema(media.schema, `${indent}  `)};`,
    );
  return `{\n${indent.slice(0, -2)}content: {\n${entries.join('\n')}\n${indent.slice(0, -2)}};\n${indent.slice(0, -4)}}`;
}

const schemas = Object.entries(document.components?.schemas ?? {})
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([name, schema]) => `    ${JSON.stringify(name)}: ${typeForSchema(schema, '      ')};`)
  .join('\n');

const paths = Object.entries(document.paths ?? {})
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([path, pathItem]) => {
    const methods = Object.entries(pathItem)
      .filter(([method]) => ['get', 'post', 'put', 'patch', 'delete'].includes(method))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([method, operation]) => {
        const responses = Object.entries(operation.responses ?? {})
          .sort(([left], [right]) => left.localeCompare(right))
          .map(
            ([status, response]) =>
              `        ${JSON.stringify(status)}: ${responseType(response, '            ')};`,
          )
          .join('\n');
        return `    ${method}: {\n      responses: {\n${responses}\n      };\n    };`;
      })
      .join('\n');
    return `  ${JSON.stringify(path)}: {\n${methods}\n  };`;
  })
  .join('\n');

const output = `/**\n * Generated from openapi.json. Do not edit by hand.\n */\nexport interface components {\n  schemas: {\n${schemas}\n  };\n}\n\nexport interface paths {\n${paths}\n}\n\nexport type operations = Record<string, never>;\n`;

await writeFile(`${packageRoot}src/schema.d.ts`, output, 'utf8');
