import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataDir = join(__dirname, '..', 'data');
const dbFile = join(dataDir, 'responses.json');

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function readDatabase() {
  try {
    if (!fs.existsSync(dbFile)) return [];
    const data = fs.readFileSync(dbFile, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeDatabase(data) {
  try {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('❌ Failed to write database:', error.message);
  }
}

export async function initializeDatabase() {
  try {
    ensureDataDir();
    const responses = readDatabase();
    console.log(`✅ Local JSON database ready (${responses.length} previous responses)`);
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
}

export async function getDbStatus() {
  try {
    ensureDataDir();
    readDatabase();
    return true;
  } catch (error) {
    throw new Error('Database not accessible');
  }
}

export async function saveResponse(payload, source = 'backend-proxy') {
  try {
    ensureDataDir();
    const responses = readDatabase();
    responses.push({
      id: responses.length + 1,
      response_data: payload,
      source,
      created_at: new Date().toISOString(),
    });
    writeDatabase(responses);
    console.log(`✅ Response saved to local storage (${responses.length} total)`);
  } catch (error) {
    console.error('❌ Failed to save response:', error.message);
    // Don't throw - allow API to continue working
  }
}

export async function proxyAiRequest(url, method, body) {
  const headers = { 'Content-Type': 'application/json' };
  const response = await fetch(url, {
    method,
    headers,
    body: method === 'GET' ? undefined : JSON.stringify(body),
  });

  return response;
}

