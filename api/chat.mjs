import { phase1Gateway as chat } from '../server/phase1-gateway.mjs';
import { serve } from '../server/http.mjs';
export default function handler(req, res) { return serve(req, res, chat); }
