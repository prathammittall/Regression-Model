import { saveResponse, getDbStatus, proxyAiRequest } from '../services/storageService.js';

const AI_MODEL_URL = process.env.AI_MODEL_URL || 'http://localhost:8000';

export const health = (req, res) => {
  res.json({ status: 'ok' });
};

export const status = async (req, res) => {
  try {
    await getDbStatus();
    res.json({ status: 'ok', db: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', db: 'disconnected', message: error.message });
  }
};

export const proxyEvaluation = async (req, res) => {
  const targetUrl = `${AI_MODEL_URL}${req.path}`;

  try {
    const response = await proxyAiRequest(targetUrl, req.method, req.body);
    const responseText = await response.text();

    let payload = null;
    try {
      payload = responseText ? JSON.parse(responseText) : null;
    } catch {
      payload = responseText;
    }

    if (response.ok && payload) {
      await saveResponse(payload, 'ai_model');
    }

    res.status(response.status).type('application/json').send(responseText);
  } catch (error) {
    console.error('Proxy request failed:', error);
    res.status(502).json({ error: 'Unable to reach AI model service', details: error.message });
  }
};

export const storeResponse = async (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: 'Request body is required.' });
  }

  try {
    await saveResponse(req.body, 'direct');
    res.status(201).json({ status: 'stored' });
  } catch (error) {
    console.error('Failed to store response:', error);
    res.status(500).json({ error: 'Failed to store response', details: error.message });
  }
};
