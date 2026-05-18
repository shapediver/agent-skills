/**
 * get-model-info.js — Retrieve parameter, output, and export metadata
 * for a ShapeDiver model via the Platform and Geometry Backend APIs.
 *
 * Self-contained: auto-installs npm dependencies on first run.
 * Outputs structured JSON to stdout; diagnostics go to stderr.
 *
 * Exit codes:
 *   0  Success
 *   1  Missing or invalid arguments
 *   2  Authentication failure
 *   3  Model not found or inaccessible
 *   4  Geometry backend / session error
 */

const { execSync } = require('child_process');

// ── Self-contained dependency resolution ────────────────────────────────────
const DEPS = [
    '@shapediver/sdk.platform-api-sdk-v1',
    '@shapediver/sdk.geometry-api-sdk-v2',
];

function ensureDeps() {
    for (const dep of DEPS) {
        try {
            require.resolve(dep);
        } catch {
            process.stderr.write(`Installing ${dep}...\n`);
            execSync(`npm install --prefix "${__dirname}" ${dep}`, {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: __dirname,
            });
        }
    }
}

// ── Argument parsing ────────────────────────────────────────────────────────
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    process.stderr.write(`\
Usage: node scripts/get-model-info.js <accessKeyId> <accessKeySecret> <slug> [options]

Retrieve parameter, output, and export metadata for a ShapeDiver model.
Outputs clean JSON to stdout. Diagnostics go to stderr.

Arguments:
  accessKeyId       Platform API access key ID
  accessKeySecret   Platform API access key secret
  slug              Model slug, ID, or GUID (from shapediver.com/app/m/{slug})

Options:
  --client-id ID    OAuth client ID (default: cab26d46-f4c7-4f16-8f44-6c801e917d22)
  --platform-url U  Platform base URL (default: https://app.shapediver.com)
  --help, -h        Show this help message

Exit codes:
  0  Success
  1  Missing or invalid arguments
  2  Authentication failure
  3  Model not found or inaccessible
  4  Geometry backend / session error

Examples:
  node scripts/get-model-info.js KEY_ID KEY_SECRET my-model-slug
  node scripts/get-model-info.js KEY_ID KEY_SECRET my-model-slug --client-id abc-123
`);
    process.exit(args.length === 0 ? 1 : 0);
}

const positional = [];
let clientId = 'cab26d46-f4c7-4f16-8f44-6c801e917d22';
let platformUrl = 'https://app.shapediver.com';

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--client-id' && args[i + 1]) {
        clientId = args[++i];
    } else if (args[i] === '--platform-url' && args[i + 1]) {
        platformUrl = args[++i];
    } else if (!args[i].startsWith('--')) {
        positional.push(args[i]);
    }
}

const [accessKeyId, accessKeySecret, slug] = positional;

if (!slug || !accessKeyId || !accessKeySecret) {
    process.stderr.write(
        'Error: Missing required arguments. Expected: <accessKeyId> <accessKeySecret> <slug>\n' +
        'Run with --help for usage information.\n'
    );
    process.exit(1);
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
    ensureDeps();

    const platformPkg = require('@shapediver/sdk.platform-api-sdk-v1');
    const geometryPkg = require('@shapediver/sdk.geometry-api-sdk-v2');

    // Step 1: Authenticate
    process.stderr.write('Authenticating with ShapeDiver Platform...\n');
    const platformSdk = platformPkg.create({ baseUrl: platformUrl, clientId });
    try {
        await platformSdk.authorization.passwordGrant(accessKeyId, accessKeySecret);
    } catch (e) {
        process.stderr.write(
            `Error: Authentication failed. Check your access key ID and secret.\n` +
            `Detail: ${e.message}\n`
        );
        process.exit(2);
    }

    // Step 2: Get model info
    process.stderr.write(`Fetching model '${slug}'...\n`);
    let model;
    try {
        const resp = await platformSdk.models.get(slug, ['ticket', 'backend_ticket', 'backend_system', 'token_view', 'accessdomains', 'global_accessdomains']);
        model = resp.data;
    } catch (e) {
        process.stderr.write(
            `Error: Could not fetch model '${slug}'. Check the slug/id and your permissions.\n` +
            `Detail: ${e.message}\n`
        );
        process.exit(3);
    }

    if (!model.backend_system) {
        process.stderr.write('Error: No backend_system returned. The model may not be fully initialized.\n');
        process.exit(3);
    }

    const geometryBackendUrl = model.backend_system.model_view_url;

    if (!model.access_token) {
        process.stderr.write('Error: No access token (JWT) available for the model.\n');
        process.exit(3);
    }

    // Step 3: Init session on Geometry Backend using JWT
    process.stderr.write('Querying Geometry Backend for model metadata...\n');
    const geoConfig = new geometryPkg.Configuration({ basePath: geometryBackendUrl, accessToken: model.access_token });
    const sessionApi = new geometryPkg.SessionApi(geoConfig);
    let sessionData;
    try {
        const resp = await sessionApi.createSessionByModel(model.guid);
        sessionData = resp.data;
    } catch (e) {
        const apiMsg = e.response?.data?.message || e.message;
        process.stderr.write(
            `Error: Geometry Backend session init failed.\n` +
            `Detail: ${apiMsg}\n`
        );
        process.exit(4);
    }

    const parameters = sessionData.parameters ? Object.values(sessionData.parameters) : [];
    const outputs = sessionData.outputs ? Object.values(sessionData.outputs) : [];
    const exports_ = sessionData.exports ? Object.values(sessionData.exports) : [];

    // Close session (fire-and-forget — we only needed the metadata)
    if (sessionData.sessionId) {
        sessionApi.closeSession(sessionData.sessionId).catch(() => {});
    }

    // ── Structured JSON to stdout ───────────────────────────────────────────
    // ticket = embedding ticket (for Viewer in browser)
    // backendTicket = backend ticket (for headless/server-side SDK)
    const embeddingTicket = model.ticket?.ticket || null;
    const backendTicket = model.backend_ticket?.ticket || null;

    const result = {
        model: {
            title: model.title,
            slug: model.slug,
            guid: model.guid,
            id: model.id,
            ticket: embeddingTicket,
            backendTicket: backendTicket,
            modelViewUrl: geometryBackendUrl,
            geometryBackendUrl, // alias kept for backwards compat
            allowedDomains: [
                ...((model.use_global_accessdomains !== false && model.global_accessdomains) || []),
                ...(model.accessdomains || []),
            ].map(d => d.name),
        },
        parameters: parameters.map(p => ({
            id: p.id,
            name: p.name,
            type: p.type,
            defval: p.defval,
            min: p.min,
            max: p.max,
            choices: p.choices,
            decimalplaces: p.decimalplaces,
            group: p.group,
            order: p.order,
            hidden: p.hidden,
            visualization: p.visualization,
            tooltip: p.tooltip,
        })),
        outputs: outputs.map(o => ({
            id: o.id,
            name: o.name,
            uid: o.uid,
            hidden: o.hidden,
            order: o.order,
        })),
        exports: exports_.map(e => ({
            id: e.id,
            name: e.name,
            type: e.type,
            hidden: e.hidden,
            order: e.order,
        })),
    };

    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    process.stderr.write(
        `Done. Found ${parameters.length} parameters, ${outputs.length} outputs, ${exports_.length} exports.\n`
    );
}

main().catch(err => {
    process.stderr.write(`Unexpected error: ${err.message || err}\n`);
    if (err.response?.data) {
        process.stderr.write(`API response: ${JSON.stringify(err.response.data)}\n`);
    }
    process.exit(4);
});
