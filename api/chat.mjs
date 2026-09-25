import { chat } from '../server/mvp.mjs';
import { serve } from '../server/http.mjs';
export default function handler(req, res) { return serve(req, res, chat); }
