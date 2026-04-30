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
Usage: node scripts/get-model-info.js <slug> <accessKeyId> <accessKeySecret> [options]

Retrieve parameter, output, and export metadata for a ShapeDiver model.
Outputs clean JSON to stdout. Diagnostics go to stderr.

Arguments:
  slug              Model slug, ID, or GUID (from shapediver.com/app/m/{slug})
  accessKeyId       Platform API access key ID
  accessKeySecret   Platform API access key secret

Options:
  --client-id ID    OAuth client ID (default: 827bcbdc-8a5c-481a-b09a-e498074d91ca)
  --platform-url U  Platform base URL (default: https://app.shapediver.com)
  --help, -h        Show this help message

Exit codes:
  0  Success
  1  Missing or invalid arguments
  2  Authentication failure
  3  Model not found or inaccessible
  4  Geometry backend / session error

Examples:
  node scripts/get-model-info.js my-model-slug KEY_ID KEY_SECRET
  node scripts/get-model-info.js my-model-slug KEY_ID KEY_SECRET --client-id abc-123
`);
    process.exit(args.length === 0 ? 1 : 0);
}

const positional = [];
let clientId = '827bcbdc-8a5c-481a-b09a-e498074d91ca';
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

const [slug, accessKeyId, accessKeySecret] = positional;

if (!slug || !accessKeyId || !accessKeySecret) {
    process.stderr.write(
        'Error: Missing required arguments. Expected: <slug> <accessKeyId> <accessKeySecret>\n' +
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
        const resp = await platformSdk.models.get(slug, ['ticket', 'backend_ticket', 'backend_system']);
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

    // Enable backend access if needed (idempotent)
    if (!model.backend_ticket) {
        process.stderr.write('Backend access not enabled. Attempting to enable...\n');
        try {
            await platformSdk.models.patch(model.id, { backendaccess: true });
            // Wait briefly for the change to propagate
            await new Promise(r => setTimeout(r, 2000));
            const m2 = await platformSdk.models.get(slug, ['ticket', 'backend_ticket', 'backend_system']);
            model.backend_ticket = m2.data.backend_ticket;
            model.ticket = m2.data.ticket;
        } catch (e) {
            process.stderr.write(
                'Error: Backend access is not enabled and could not be enabled automatically.\n' +
                'To fix this:\n' +
                '  1. Go to https://www.shapediver.com/app/m/' + slug + '\n' +
                '  2. Open the "Developers" tab\n' +
                '  3. Enable "Backend access"\n' +
                '  4. Copy the Ticket and Model View URL and provide them directly\n' +
                '     (or re-run this script)\n'
            );
            process.exit(3);
        }
    }

    if (!model.backend_ticket || !model.backend_ticket.ticket) {
        process.stderr.write('Error: No backend_ticket available even after enabling backend access.\n');
        process.exit(3);
    }

    // Step 3: Init session on Geometry Backend
    process.stderr.write('Querying Geometry Backend for model metadata...\n');
    const geoConfig = new geometryPkg.Configuration({ basePath: geometryBackendUrl });
    const sessionApi = new geometryPkg.SessionApi(geoConfig);
    let sessionData;
    try {
        const resp = await sessionApi.createSessionByTicket(model.backend_ticket.ticket);
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
    const backendTicket = model.backend_ticket.ticket;

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
