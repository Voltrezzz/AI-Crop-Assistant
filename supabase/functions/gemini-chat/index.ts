const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || '*';
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const authorization = request.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!authorization || !supabaseUrl || !supabaseAnonKey) {
    return json({ error: 'Authentication is required.' }, 401);
  }

  // Verify the caller with Supabase Auth. The browser never receives Gemini's key.
  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: authorization, apikey: supabaseAnonKey },
  });
  if (!authResponse.ok) return json({ error: 'Invalid or expired session.' }, 401);

  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiKey) return json({ error: 'Gemini is not configured on the server.' }, 503);

  let body: {
    message?: string;
    history?: Array<{ role?: string; content?: string }>;
    language?: string;
    userContext?: { name?: string; location?: string; state?: string; profileType?: string };
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON request.' }, 400);
  }

  const message = body.message?.trim();
  if (!message || message.length > 4000) return json({ error: 'Message must be between 1 and 4000 characters.' }, 400);

  const context = body.userContext || {};
  const farmerContext = [
    context.name && `Name: ${context.name}`,
    context.location && `Location: ${context.location}`,
    context.state && `State/region: ${context.state}`,
    context.profileType && `Profile: ${context.profileType}`,
  ].filter(Boolean).join('; ') || 'No saved farmer profile details.';
  const language = String(body.language || 'English').slice(0, 40);

  const systemInstruction = `You are CropSense AI, an agriculture-only assistant for Indian farmers.

Scope:
- Help only with farming and closely related topics: crops, soil, nutrients, irrigation, pests, plant diseases, livestock, farm operations, weather interpretation, post-harvest handling, agricultural markets, and government farming schemes.
- For unrelated requests, respond briefly that you can help with farming, then offer relevant farming topics. Do not answer the unrelated request.

Personalization:
- Use the farmer profile and conversation history to adapt to the user's crop, location, season, constraints, experience, and preferred answer style.
- Do not repeat questions already answered. Ask at most two focused questions when essential details are missing.
- Reply in ${language}; follow another Indian language used by the farmer where possible.

Quality and safety:
- Give practical, concise, step-by-step advice.
- Do not invent live weather, mandi prices, regulations, availability, scheme eligibility, pesticide approvals, or diagnoses.
- For pesticides, fertilizer rates, veterinary medicines, or severe outbreaks, recommend label-compliant locally registered options and qualified local guidance with safety precautions.
- Escalate urgent plant, animal, or human safety concerns to a qualified local professional.

Current farmer profile: ${farmerContext}`;

  const history = Array.isArray(body.history) ? body.history.slice(-16) : [];
  const contents = history
    .filter(item => typeof item.content === 'string' && item.content.trim())
    .map(item => ({
      role: item.role === 'user' ? 'user' : 'model',
      parts: [{ text: item.content!.slice(0, 4000) }],
    }));
  contents.push({ role: 'user', parts: [{ text: message }] });

  const model = Deno.env.get('GEMINI_MODEL') || 'gemini-3.6-flash';
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
      }),
    },
  );

  const result = await response.json();
  if (!response.ok) {
    console.error('Gemini proxy error', { status: response.status, message: result?.error?.message });
    return json({ error: 'Gemini is temporarily unavailable.' }, response.status);
  }
  const text = result?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text || '')
    .join('')
    .trim();
  return text ? json({ text }) : json({ error: 'Gemini returned an empty response.' }, 502);
});
