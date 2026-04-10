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

  // Map controller identifiers used in this route module to their controller file.
  // This lets us enrich operations with requestBody schemas extracted from express-validator.
  const controllersByAlias = new Map(); // alias -> absolute controller file path
  const controllersByNamedExport = new Map(); // exportName -> absolute controller file path

  const resolveControllerFile = (relImportPath) => {
    const absNoExt = path.join(path.dirname(moduleFilePath), relImportPath);
    const candidateTs = `${absNoExt}.ts`;
    const candidateJs = `${absNoExt}.js`;
    if (fs.existsSync(candidateTs)) return candidateTs;
    if (fs.existsSync(candidateJs)) return candidateJs;
    return null;
  };

  // import * as formsController from '../controllers/forms.controller';
  const importStarRegex = /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]\s*;/g;
  for (;;) {
    const m = importStarRegex.exec(content);
    if (!m) break;
    const alias = m[1];
    const controllerFilePath = resolveControllerFile(m[2]);
    if (controllerFilePath) controllersByAlias.set(alias, controllerFilePath);
  }

  // import { addConv, updateConv } from '../controllers/conversations.controller';
  const importNamedRegex = /import\s*\{([^}]+)\}\s*from\s+['"]([^'"]+)['"]\s*;/g;
  for (;;) {
    const m = importNamedRegex.exec(content);
    if (!m) break;
    const names = m[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const controllerFilePath = resolveControllerFile(m[2]);
    if (!controllerFilePath) continue;
    for (const n of names) controllersByNamedExport.set(n, controllerFilePath);
  }

  // router.get('/clients/:clientId', authenticate, getClientConversations);
  const endpointRegex = /router\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]\s*,/g;

  const endpoints = [];
  for (;;) {
    const m = endpointRegex.exec(content);
    if (!m) break;

    const method = m[1];
    const endpointPath = m[2];

    const fullExpressPath = `/api${moduleBase}${endpointPath}`;
    const statementEnd = content.indexOf(';', m.index);
    const statementChunk = statementEnd === -1 ? content.slice(m.index) : content.slice(m.index, statementEnd);

    // Determine auth requirements:
    // - route-level middleware in the same call: router.get('/x', authenticate, ...)
    // - module-level middleware: router.use(authenticate); applied to following routes in this file
    const authUses = [...content.matchAll(/router\.use\(\s*authenticate\s*\)/g)].map((x) => x.index);
    const adminUses = [...content.matchAll(/router\.use\(\s*requireAdmin\s*\)/g)].map((x) => x.index);

    const jwtAuthInRoute = /\bauthenticate\b/.test(statementChunk);

    let authRequired = jwtAuthInRoute || authUses.some((idx) => idx !== undefined && idx < m.index);
    const adminRequired =
      statementChunk.includes('requireAdmin') || adminUses.some((idx) => idx !== undefined && idx < m.index);

    // Admin implies auth in this project.
    if (adminRequired) authRequired = true;

    const tag = moduleBase.replace(/^\//, '').replace(/\/$/, '') || 'root';

    // Detect which controller handler is used in this route call.
    // Example:
    // - router.post('/', clientsController.createClient);
    // - router.patch('/:id', ...conversationsController.updateConv);
    let handlerName = null;
    let controllerFilePath = null;

    let lastIndex = -1;
    for (const [alias, absControllerFile] of controllersByAlias.entries()) {
      const aliasRegex = new RegExp(`${alias}\\.([A-Za-z0-9_]+)`, 'g');
      for (;;) {
        const mm = aliasRegex.exec(statementChunk);
        if (!mm) break;
        if (mm.index > lastIndex) {
          lastIndex = mm.index;
          handlerName = mm[1];
          controllerFilePath = absControllerFile;
        }
      }
    }

    for (const [exportName, absControllerFile] of controllersByNamedExport.entries()) {
      const namedRegex = new RegExp(`\\b${exportName}\\b`, 'g');
      for (;;) {
        const mm = namedRegex.exec(statementChunk);
        if (!mm) break;
        if (mm.index > lastIndex) {
          lastIndex = mm.index;
          handlerName = exportName;
          controllerFilePath = absControllerFile;
        }
      }
    }

    endpoints.push({
      method,
      expressPath: normalizeOpenApiPath(fullExpressPath),
      openApiPath: toOpenApiPath(normalizeOpenApiPath(fullExpressPath)),
      parameters: extractParams(fullExpressPath),
      tag,
      authRequired,
      adminRequired,
      controllerFilePath,
      handlerName,
    });
  }

  return endpoints;
}

function inferTypeFromValidatorWindow(windowText) {
  if (/isInt\s*\(/.test(windowText)) return { type: 'integer' };
  if (/isFloat\s*\(/.test(windowText) || /isDecimal\s*\(/.test(windowText)) return { type: 'number' };
  if (/isBoolean\s*\(/.test(windowText)) return { type: 'boolean' };
  if (/isArray\s*\(/.test(windowText)) return { type: 'array' };
  if (/isObject\s*\(/.test(windowText)) return { type: 'object' };
  if (/isISO8601\s*\(/.test(windowText)) return { type: 'string', format: 'date-time' };
  return { type: 'string' };
}

function buildNestedObjectSchema(fields) {
  const root = { type: 'object', properties: {}, required: [] };

  const ensureObject = (obj) => {
    if (!obj || obj.type !== 'object') return { type: 'object', properties: {}, required: [] };
    if (!obj.properties) obj.properties = {};
    if (!obj.required) obj.required = [];
    return obj;
  };

  const dedupeRequiredLists = (node) => {
    if (node && Array.isArray(node.required)) node.required = [...new Set(node.required)];
    if (node && node.properties) {
      for (const v of Object.values(node.properties)) dedupeRequiredLists(v);
    }
  };

  const setAtPath = (node, segments, leafSchema, requiredFlag, treatArrayItems) => {
    // segments: ['a','b','c'] leaf at last segment
    const segCount = segments.length;
    if (segCount === 0) return;

    if (segCount === 1) {
      if (treatArrayItems) {
        node.properties[segments[0]] = {
          type: 'array',
          items: leafSchema,
        };
      } else {
        node.properties[segments[0]] = leafSchema;
      }
      if (requiredFlag) node.required.push(segments[0]);
      return;
    }

    const head = segments[0];
    if (!node.properties[head]) node.properties[head] = { type: 'object', properties: {}, required: [] };
    node.properties[head] = ensureObject(node.properties[head]);
    setAtPath(node.properties[head], segments.slice(1), leafSchema, requiredFlag, treatArrayItems);
  };

  for (const f of fields) {
    const requiredFlag = f.required === true;
    // For `field.*` we model parent as array with item schema.
    // Example: 'audienceRoles.*' => root.properties.audienceRoles = {type:'array', items:{...}}
    setAtPath(root, f.pathSegments, f.schema, requiredFlag, f.isArrayItems === true);
  }

  dedupeRequiredLists(root);
  if (root.required.length === 0) delete root.required;
  return root;
}

function extractRequestBodyFields(controllerFilePath, handlerName) {
  const content = readText(controllerFilePath);
  const startRe = new RegExp(`export\\s+const\\s+${handlerName}\\s*=`, 'm');
  const startMatch = startRe.exec(content);
  if (!startMatch || startMatch.index === undefined) return [];

  // Best-effort: slice until next `export const` in this file.
  const nextExportRe = /\nexport\s+const\s+/g;
  nextExportRe.lastIndex = startMatch.index + 1;
  const nextMatch = nextExportRe.exec(content);
  const endIndex = nextMatch && nextMatch.index ? nextMatch.index : content.length;
  const block = content.slice(startMatch.index, endIndex);

  const bodyCallRe = /body\(\s*['"]([^'"]+)['"]\s*\)/g;
  const fields = [];

  for (;;) {
    const m = bodyCallRe.exec(block);
    if (!m) break;

    const fieldPath = m[1];
    const windowText = block.slice(m.index, m.index + 300);
    const required = !/\.optional\s*\(/.test(windowText);
    const inferred = inferTypeFromValidatorWindow(windowText);

    const isArrayItems = fieldPath.endsWith('.*');
    const pathSegments = isArrayItems ? fieldPath.slice(0, -2).split('.').filter(Boolean) : fieldPath.split('.').filter(Boolean);
    if (pathSegments.length === 0) continue;

    fields.push({
      name: fieldPath,
      required,
      schema: inferred,
      isArrayItems,
      pathSegments,
    });
  }

  return fields;
}

function buildOpenApiSpec(allEndpoints) {
  const validationCache = new Map(); // key: controllerFilePath::handlerName

  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'Backend API',
      version: '1.0.0',
    },
    servers: [{ url: '/' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    paths: {},
  };

  for (const ep of allEndpoints) {
    if (!spec.paths[ep.openApiPath]) spec.paths[ep.openApiPath] = {};

    const methodLower = ep.method.toLowerCase();
    const parameters =
      ep.parameters.length > 0
        ? ep.parameters.map((name) => {
          let description = `Path parameter: ${name}`;
          const lower = name.toLowerCase();
          if (lower === 'id' || lower.endsWith('id')) description = `ID: ${name}`;
          else if (lower.includes('phone')) description = `Phone: ${name}`;
          else if (lower.includes('session')) description = `Session ID: ${name}`;
          return {
            name,
            in: 'path',
            required: true,
            description,
            schema: { type: 'string' },
          };
        })
        : undefined;

    const operationIdBase = `${ep.method}_${ep.openApiPath}`.replace(/[^a-zA-Z0-9_]/g, '_');
    const summary = `${ep.method.toUpperCase()} ${ep.openApiPath}`;
    const descriptionParts = ['Endpoint generado automaticamente desde rutas de Express.'];
    if (ep.adminRequired) descriptionParts.push('Requiere autenticacion y rol admin.');
    else if (ep.authRequired) descriptionParts.push('Requiere autenticacion.');
    else descriptionParts.push('Acceso publico.');
    const description = descriptionParts.join(' ');

    // Optional: derive requestBody from express-validator definitions in controller export.
    let requestBody = undefined;
    if (ep.controllerFilePath && ep.handlerName && ['post', 'put', 'patch'].includes(methodLower)) {
      const cacheKey = `${ep.controllerFilePath}::${ep.handlerName}`;
      if (!validationCache.has(cacheKey)) {
        validationCache.set(cacheKey, extractRequestBodyFields(ep.controllerFilePath, ep.handlerName));
      }
      const fields = validationCache.get(cacheKey) || [];
      if (fields.length > 0) {
        requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: buildNestedObjectSchema(fields),
            },
          },
        };
      }
    }

    const securityBlock = ep.authRequired ? { security: [{ bearerAuth: [] }] } : {};

    spec.paths[ep.openApiPath][methodLower] = {
      tags: [ep.tag],
      operationId: operationIdBase,
      summary,
      description,
      ...(parameters ? { parameters } : {}),
      ...(requestBody ? { requestBody } : {}),
      ...securityBlock,
      responses: {
        '200': { description: 'OK' },
        ...(requestBody ? { '400': { description: 'Bad Request (validation errors)' } } : {}),
        ...(ep.authRequired ? { '401': { description: 'Unauthorized' } } : {}),
        ...(ep.adminRequired ? { '403': { description: 'Forbidden' } } : {}),
      },
    };
  }

  // Add GET /health outside `/api`
  spec.paths['/health'] = {
    get: {
      tags: ['health'],
      operationId: 'GET_health',
      summary: 'GET /health',
      description: 'Endpoint de health check.',
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

