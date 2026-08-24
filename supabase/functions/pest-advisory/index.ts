const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || '*';
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Officially documented stable multimodal model as of 2026-08-24. Override
// with GEMINI_MODEL after checking the Models API for the deployment project.
const DEFAULT_GEMINI_MODEL = 'gemini-3.7-flash';
const MAX_IMAGE_BASE64_CHARS = 5_600_000; // Covers a prepared JPEG up to 4 MiB.

type Advisory = {
  possibleIssue: string;
  crop: 'Paddy/Rice' | 'Wheat' | 'Unknown';
  confidence: 'low' | 'moderate' | 'high';
  visibleSigns: string[];
  possiblePests: string[];
  recommendedActions: string[];
  organicOptions: string[];
  chemicalGuidance: string[];
  precautions: string[];
  needsExpertReview: boolean;
  cropMismatch: boolean;
  imageQuality: 'adequate' | 'poor';
  imageAssessment: 'suitable' | 'poor_quality' | 'unrelated' | 'no_obvious_damage';
  summary: string;
};

type GeminiResult = {
  error?: { code?: unknown };
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(code: string, message: string, status: number) {
  return json({ error: { code, message } }, status);
}

function validateStringArray(value: unknown, max: number): string[] | null {
  if (!Array.isArray(value) || value.length > max) return null;
  const items = value.map(item => typeof item === 'string' ? item.trim() : '');
  return items.every(item => item.length > 0 && item.length <= 300) ? items : null;
}

function validateAdvisory(value: unknown): Advisory | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const possibleIssue = typeof item.possibleIssue === 'string' ? item.possibleIssue.trim() : '';
  const summary = typeof item.summary === 'string' ? item.summary.trim() : '';
  const crop = item.crop;
  const confidence = item.confidence;
  const imageQuality = item.imageQuality;
  const imageAssessment = item.imageAssessment;
  if (!possibleIssue || possibleIssue.length > 200 || !summary || summary.length > 600) return null;
  if (!['Paddy/Rice', 'Wheat', 'Unknown'].includes(String(crop))) return null;
  if (!['low', 'moderate', 'high'].includes(String(confidence))) return null;
  if (!['adequate', 'poor'].includes(String(imageQuality))) return null;
  if (!['suitable', 'poor_quality', 'unrelated', 'no_obvious_damage'].includes(String(imageAssessment))) return null;
  if (typeof item.needsExpertReview !== 'boolean' || typeof item.cropMismatch !== 'boolean') return null;

  const visibleSigns = validateStringArray(item.visibleSigns, 10);
  const possiblePests = validateStringArray(item.possiblePests, 8);
  const recommendedActions = validateStringArray(item.recommendedActions, 10);
  const organicOptions = validateStringArray(item.organicOptions, 8);
  const chemicalGuidance = validateStringArray(item.chemicalGuidance, 8);
  const precautions = validateStringArray(item.precautions, 10);
  if (!visibleSigns || !possiblePests || !recommendedActions || !organicOptions || !chemicalGuidance || !precautions) return null;

  return {
    possibleIssue,
    crop: crop as Advisory['crop'],
    confidence: confidence as Advisory['confidence'],
    visibleSigns,
    possiblePests,
    recommendedActions,
    organicOptions,
    chemicalGuidance,
    precautions,
    needsExpertReview: item.needsExpertReview,
    cropMismatch: item.cropMismatch,
    imageQuality: imageQuality as Advisory['imageQuality'],
    imageAssessment: imageAssessment as Advisory['imageAssessment'],
    summary,
  };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return errorResponse('method_not_allowed', 'Method not allowed.', 405);

  const authorization = request.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!authorization?.startsWith('Bearer ') || authorization.length <= 'Bearer '.length || !supabaseUrl || !supabaseAnonKey) {
    return errorResponse('auth_required', 'Authentication is required.', 401);
  }

  try {
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: authorization, apikey: supabaseAnonKey },
    });
    if (!authResponse.ok) return errorResponse('invalid_session', 'Invalid or expired session.', 401);
  } catch (error) {
    console.error('Supabase session verification failed', {
      name: error instanceof Error ? error.name : 'UnknownError',
    });
    return errorResponse('service_unavailable', 'AI pest analysis is temporarily unavailable.', 503);
  }

  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiKey) return errorResponse('service_unavailable', 'AI pest analysis is temporarily unavailable.', 503);

  let body: {
    selectedCrop?: 'paddy' | 'wheat' | 'unspecified';
    image?: { data?: string; mimeType?: string };
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse('invalid_request', 'Invalid request.', 400);
  }

  const selectedCrop = ['paddy', 'wheat', 'unspecified'].includes(String(body.selectedCrop))
    ? String(body.selectedCrop)
    : 'unspecified';
  const imageData = body.image?.data;
  const mimeType = body.image?.mimeType;
  if (mimeType !== 'image/jpeg' || typeof imageData !== 'string' || imageData.length < 100 || imageData.length > MAX_IMAGE_BASE64_CHARS) {
    return errorResponse('invalid_image', 'A valid prepared JPEG image is required.', 400);
  }
  if (!/^[A-Za-z0-9+/=]+$/.test(imageData)) {
    return errorResponse('invalid_image', 'A valid prepared JPEG image is required.', 400);
  }

  const selectedCropText = selectedCrop === 'paddy'
    ? 'The farmer selected Paddy/Rice.'
    : selectedCrop === 'wheat'
      ? 'The farmer selected Wheat.'
      : 'The farmer did not select a crop.';

  const systemInstruction = `You are Marudham 360's visual pest-damage advisory assistant for Indian rice and wheat farmers.

Analyze only visible evidence in the supplied crop image: visible insects, larvae, clusters, chewing, holes, curling, discoloration, webbing, mines, deposits, or other plausible pest damage.

Rules:
- This is visual guidance, not a confirmed diagnosis and not a trained pest detector.
- Prefer uncertainty over hallucination. Never identify a pest with high confidence unless clear visible evidence supports it.
- If quality is too poor, set imageAssessment to "poor_quality", imageQuality to "poor", confidence to "low", and request a clearer image.
- If unrelated to agriculture or crop damage, set imageAssessment to "unrelated", crop to "Unknown", confidence to "low", and do not invent pests or treatment.
- If the crop looks healthy or no obvious pest damage is visible, set imageAssessment to "no_obvious_damage" and say so clearly.
- If the selected crop visibly conflicts with the image, set cropMismatch to true and explain the mismatch.
- Do not give pesticide product dosages, unsafe mixtures, or definitive chemical prescriptions.
- Chemical guidance must recommend confirmation, locally registered label-compliant products, protective equipment, and local agricultural advice where appropriate.
- Set needsExpertReview true for serious, uncertain, poor-quality, unusual, or spreading damage.
- Return concise JSON only, using qualitative confidence: low, moderate, or high.

${selectedCropText}`;

  const responseSchema = {
    type: 'OBJECT',
    properties: {
      possibleIssue: { type: 'STRING' },
      crop: { type: 'STRING', enum: ['Paddy/Rice', 'Wheat', 'Unknown'] },
      confidence: { type: 'STRING', enum: ['low', 'moderate', 'high'] },
      visibleSigns: { type: 'ARRAY', items: { type: 'STRING' } },
      possiblePests: { type: 'ARRAY', items: { type: 'STRING' } },
      recommendedActions: { type: 'ARRAY', items: { type: 'STRING' } },
      organicOptions: { type: 'ARRAY', items: { type: 'STRING' } },
      chemicalGuidance: { type: 'ARRAY', items: { type: 'STRING' } },
      precautions: { type: 'ARRAY', items: { type: 'STRING' } },
      needsExpertReview: { type: 'BOOLEAN' },
      cropMismatch: { type: 'BOOLEAN' },
      imageQuality: { type: 'STRING', enum: ['adequate', 'poor'] },
      imageAssessment: { type: 'STRING', enum: ['suitable', 'poor_quality', 'unrelated', 'no_obvious_damage'] },
      summary: { type: 'STRING' },
    },
    required: [
      'possibleIssue', 'crop', 'confidence', 'visibleSigns', 'possiblePests',
      'recommendedActions', 'organicOptions', 'chemicalGuidance', 'precautions',
      'needsExpertReview', 'cropMismatch', 'imageQuality', 'imageAssessment', 'summary',
    ],
  };

  const model = (Deno.env.get('GEMINI_MODEL') || DEFAULT_GEMINI_MODEL)
    .trim()
    .replace(/^models\//, '');
  if (!/^[A-Za-z0-9._-]+$/.test(model)) {
    console.error('Invalid GEMINI_MODEL configuration');
    return errorResponse('service_unavailable', 'AI pest analysis is temporarily unavailable.', 503);
  }

  let geminiResponse: Response;
  try {
    geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{
            role: 'user',
            parts: [
              { text: 'Review this image for visually supported crop pest activity or pest-related damage.' },
              { inlineData: { mimeType, data: imageData } },
            ],
          }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema,
            temperature: 0.2,
          },
        }),
      },
    );
  } catch (error) {
    console.error('Gemini pest advisory request failed', {
      name: error instanceof Error ? error.name : 'UnknownError',
    });
    return errorResponse('service_unavailable', 'AI pest analysis is temporarily unavailable.', 503);
  }

  let geminiResult: GeminiResult;
  try {
    geminiResult = await geminiResponse.json();
  } catch {
    return errorResponse('malformed_response', 'The AI response could not be interpreted.', 502);
  }
  if (!geminiResponse.ok) {
    console.error('Gemini pest advisory error', {
      status: geminiResponse.status,
      code: geminiResult?.error?.code,
    });
    return geminiResponse.status === 429
      ? errorResponse('rate_limited', 'AI analysis is temporarily busy.', 429)
      : errorResponse('service_unavailable', 'AI pest analysis is temporarily unavailable.', 503);
  }

  const responseText = geminiResult?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text || '')
    .join('')
    .replace(/^```json\s*|\s*```$/g, '')
    .trim();
  if (!responseText) return errorResponse('malformed_response', 'The AI response could not be interpreted.', 502);

  let parsed: unknown;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    return errorResponse('malformed_response', 'The AI response could not be interpreted.', 502);
  }
  const advisory = validateAdvisory(parsed);
  return advisory
    ? json({ advisory })
    : errorResponse('malformed_response', 'The AI response could not be interpreted.', 502);
});
