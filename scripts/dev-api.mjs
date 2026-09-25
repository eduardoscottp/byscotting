import { createServer } from 'node:http';
import chat from '../api/chat.mjs';
import leads from '../api/leads.mjs';
const handlers = { '/api/chat': chat, '/api/leads': leads };
createServer((req, res) => {
  const handler = handlers[new URL(req.url, 'http://localhost').pathname];
  if (!handler) { res.statusCode = 404; return res.end(); }
  return handler(req, res);
}).listen(8787, '127.0.0.1', () => console.log('Scotting API listening on http://127.0.0.1:8787 (configuration required)'));
