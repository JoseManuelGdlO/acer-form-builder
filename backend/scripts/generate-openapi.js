/* eslint-disable no-console */
/**
 * Generate a minimal OpenAPI spec by statically scanning Express routes.
 *
 * Output:
 * - backend/src/swagger/openapi.json (for dev via tsx)
 * - backend/dist/swagger/openapi.json (for start via node dist/server.js)
 */

const fs = require('fs');
const path = require('path');

const backendRoot = path.join(__dirname, '..');
const routesDir = path.join(backendRoot, 'src', 'routes');
const indexFile = path.join(routesDir, 'index.ts');

const srcSwaggerOutDir = path.join(backendRoot, 'src', 'swagger');
const distSwaggerOutDir = path.join(backendRoot, 'dist', 'swagger');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function normalizeOpenApiPath(p) {
  if (p.length > 1 && p.endsWith('/')) return p.slice(0, -1);
  return p;
}

function toOpenApiPath(expressPath) {
  // Convert Express params `:id` -> OpenAPI params `{id}`
  return expressPath.replace(/:([^/]+)/g, '{$1}');
}

function extractParams(expressPath) {
  const matches = [...expressPath.matchAll(/:([^/]+)/g)];
  const names = matches.map((m) => m[1]).filter(Boolean);
  // Keep first occurrence order but dedupe
  return [...new Set(names)];
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function resolveRouteModuleFiles() {
  const indexContent = readText(indexFile);

  // import authRoutes from './auth.routes';
  const importRegex = /import\s+(\w+)\s+from\s+['"]\.\/([^'"]+)['"]\s*;/g;
  const imports = new Map(); // varName -> relative module path (without extension)
  for (;;) {
    const m = importRegex.exec(indexContent);
    if (!m) break;
    imports.set(m[1], m[2]);
  }

  // router.use('/auth', authRoutes);
  const useRegex = /router\.use\(\s*['"]([^'"]+)['"]\s*,\s*(\w+)\s*\)/g;
  const bases = [];
  for (;;) {
    const m = useRegex.exec(indexContent);
    if (!m) break;
    const base = m[1];
    const varName = m[2];
    const moduleRel = imports.get(varName);
    if (!moduleRel) continue;
    bases.push({ base, moduleRel });
  }

  return bases.map(({ base, moduleRel }) => {
    const candidateTs = path.join(routesDir, `${moduleRel}.ts`);
    const candidateJs = path.join(routesDir, `${moduleRel}.js`);

    let resolved = candidateTs;
    if (!fs.existsSync(candidateTs) && fs.existsSync(candidateJs)) resolved = candidateJs;
    if (!fs.existsSync(resolved)) {
      // In dev TS exists; in rare cases file might not exist at generation time.
      throw new Error(`Could not find route module for "${moduleRel}" (expected ${candidateTs} or ${candidateJs})`);
    }

    return { base, filePath: resolved };
  });
}

function scanEndpointsForFile(moduleBase, moduleFilePath) {
  const content = readText(moduleFilePath);

  // router.get('/clients/:clientId', authenticate, getClientConversations);
  const endpointRegex = /router\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]\s*,/g;

  const endpoints = [];
  for (;;) {
    const m = endpointRegex.exec(content);
    if (!m) break;

    const method = m[1];
    const endpointPath = m[2];

    const fullExpressPath = `/api${moduleBase}${endpointPath}`;
    endpoints.push({
      method,
      expressPath: normalizeOpenApiPath(fullExpressPath),
      openApiPath: toOpenApiPath(normalizeOpenApiPath(fullExpressPath)),
      parameters: extractParams(fullExpressPath),
    });
  }

  return endpoints;
}

function buildOpenApiSpec(allEndpoints) {
  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'Backend API',
      version: '1.0.0',
    },
    servers: [{ url: '/' }],
    paths: {},
  };

  for (const ep of allEndpoints) {
    if (!spec.paths[ep.openApiPath]) spec.paths[ep.openApiPath] = {};

    const methodLower = ep.method.toLowerCase();
    const parameters =
      ep.parameters.length > 0
        ? ep.parameters.map((name) => ({
          name,
          in: 'path',
          required: true,
          schema: { type: 'string' },
        }))
        : undefined;

    spec.paths[ep.openApiPath][methodLower] = {
      ...(parameters ? { parameters } : {}),
      responses: {
        '200': { description: 'OK' },
      },
    };
  }

  // Add GET /health outside `/api`
  spec.paths['/health'] = {
    get: {
      responses: {
        '200': { description: 'OK' },
      },
    },
  };

  return spec;
}

function main() {
  const modules = resolveRouteModuleFiles();

  const allEndpoints = [];
  for (const mod of modules) {
    allEndpoints.push(...scanEndpointsForFile(mod.base, mod.filePath));
  }

  const openApiSpec = buildOpenApiSpec(allEndpoints);

  // Ensure output dirs exist for both dev and prod runtime
  ensureDir(srcSwaggerOutDir);
  ensureDir(distSwaggerOutDir);

  fs.writeFileSync(path.join(srcSwaggerOutDir, 'openapi.json'), JSON.stringify(openApiSpec, null, 2), 'utf8');
  fs.writeFileSync(path.join(distSwaggerOutDir, 'openapi.json'), JSON.stringify(openApiSpec, null, 2), 'utf8');

  console.log(`Generated OpenAPI spec with ${allEndpoints.length} endpoints.`);
}

main();

