import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const artifactsDir = path.join(rootDir, 'artifacts', 'contracts');
// Writes to its own file so it never clobbers the hand-maintained src/lib/contracts.ts
const outputDir = path.join(rootDir, 'src', 'lib', 'generated');
const outputFile = path.join(outputDir, 'abis.ts');

const contractNames = [
    'DAO',
    'Treasury',
    'UTPToken',
    'UBTC',
    'GovernancePlugin',
    'UtPTimelock',
    'PluginRegistry',
    'UTPPolling',
    'EventMarket',
    'StablecoinController'
];

function findArtifact(contractName) {
    const files = fs.readdirSync(artifactsDir, { recursive: true });
    const artifactFile = files.find(file => path.basename(file) === `${contractName}.json`);
    if (!artifactFile) {
        throw new Error(`Artifact not found for ${contractName}`);
    }
    const fullPath = path.join(artifactsDir, artifactFile);
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

let outputContent = `// Auto-generated from Hardhat artifacts — do not edit manually\n\n`;

for (const name of contractNames) {
    const artifact = findArtifact(name);
    outputContent += `export const ${name}ABI = ${JSON.stringify(artifact.abi, null, 2)} as const;\n\n`;
}

// Add addresses
const deploymentsDir = path.join(rootDir, 'deployments');
// Only canonical per-network files (e.g. rskTestnet.json), not timestamped run logs
const addressFiles = fs.readdirSync(deploymentsDir).filter(f => /^[A-Za-z]+\.json$/.test(f));

const addresses = {};
for (const file of addressFiles) {
    const network = file.replace('.json', '');
    addresses[network] = JSON.parse(fs.readFileSync(path.join(deploymentsDir, file), 'utf8'));
}

outputContent += `export const ADDRESSES = ${JSON.stringify(addresses, null, 2)} as const;\n`;

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputFile, outputContent);

console.log(`✅ ABIs and addresses written to ${outputFile}`);
