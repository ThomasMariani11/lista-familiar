// Servidor de categorización para Lista familiar (Cloudflare Worker).
// Guarda GEMINI_API_KEY como secreto del servidor: nunca llega al navegador.
// Solo responde a integrantes de la familia con una sesión válida de Firebase.

// Deben coincidir exactamente con CATEGORIES de app.js.
const CATEGORIES = ["Frutas y Verduras", "Carnes", "Fiambrería", "Lácteos", "Panadería", "Almacén", "Congelados", "Bebidas", "Limpieza", "Higiene", "Mascotas", "Otros"];
const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const FIREBASE_KEYS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const GEMINI_TIMEOUT_MS = 8000;

const SYSTEM_INSTRUCTION = [
  "Clasificás productos de una lista de supermercado de una familia de Argentina.",
  `Respondé solo con una de estas categorías: ${CATEGORIES.join(", ")}.`,
  "Guía: Almacén incluye secos, enlatados, snacks, dulces, condimentos e infusiones.",
  "Carnes incluye vacuna, pollo, cerdo y pescados frescos. Fiambrería incluye jamón, salame y otros fiambres.",
  "Lácteos incluye leche, quesos, yogur, manteca y huevos. Panadería incluye pan, facturas y tapas de tarta o empanadas.",
  "Congelados incluye helados y comidas congeladas. Mascotas incluye alimento y accesorios para animales.",
  "Higiene es cuidado personal y botiquín. Limpieza es limpieza del hogar. Si no estás seguro, usá Otros.",
].join(" ");

let cachedKeys = null;

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: cors ? 204 : 403, headers: cors || {} });
    if (!cors) return json({ error: "origen_no_permitido" }, 403);

    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/categorize") return json({ error: "no_encontrado" }, 404, cors);

    if (!env.GEMINI_API_KEY) return json({ error: "sin_configurar" }, 503, cors);

    try {
      await verifyFirebaseUser(request, env);
    } catch (error) {
      return json({ error: "no_autorizado" }, 401, cors);
    }

    let producto;
    try {
      producto = String((await request.json()).producto || "").trim();
    } catch {
      return json({ error: "solicitud_invalida" }, 400, cors);
    }
    if (!producto || producto.length > 100) return json({ error: "solicitud_invalida" }, 400, cors);

    const result = await askGemini(producto, env);
    return json(result.body, result.status, cors);
  },
};

async function askGemini(producto, env) {
  const body = {
    model: env.GEMINI_MODEL || DEFAULT_MODEL,
    system_instruction: SYSTEM_INSTRUCTION,
    input: `Producto: ${producto}`,
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: {
        type: "object",
        properties: { categoria: { type: "string", enum: CATEGORIES } },
        required: ["categoria"],
      },
    },
  };
  // Cada modelo acepta distintos niveles; vacío = usar el predeterminado del modelo.
  const thinkingLevel = env.GEMINI_THINKING_LEVEL ?? "minimal";
  if (thinkingLevel) body.generation_config = { thinking_level: thinkingLevel };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    return { status: 504, body: { error: "gemini_no_responde" } };
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 429) return { status: 429, body: { error: "limite_alcanzado" } };
  if (!response.ok) {
    console.error("Gemini respondió", response.status, (await response.text()).slice(0, 500));
    return { status: 502, body: { error: "gemini_error" } };
  }

  const data = await response.json();
  const categoria = parseCategory(data);
  if (!categoria) {
    console.error("Respuesta de Gemini sin categoría válida", JSON.stringify(data).slice(0, 500));
    return { status: 502, body: { error: "categoria_invalida" } };
  }
  return { status: 200, body: { categoria, modelo: body.model } };
}

function parseCategory(data) {
  const texts = (data.steps || [])
    .filter((step) => step.type === "model_output")
    .flatMap((step) => step.content || [])
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text);
  for (const text of texts.reverse()) {
    try {
      const value = JSON.parse(text).categoria;
      if (CATEGORIES.includes(value)) return value;
    } catch {
      // Se ignora y se prueba el siguiente bloque.
    }
  }
  return null;
}

// --- Sesión de Firebase -----------------------------------------------------

async function verifyFirebaseUser(request, env) {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const [rawHeader, rawPayload, rawSignature] = token.split(".");
  if (!rawHeader || !rawPayload || !rawSignature) throw new Error("token");

  const header = JSON.parse(decodeText(rawHeader));
  const payload = JSON.parse(decodeText(rawPayload));
  if (header.alg !== "RS256" || !header.kid) throw new Error("alg");

  const keys = await firebaseKeys();
  const jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) throw new Error("kid");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, decodeBytes(rawSignature), new TextEncoder().encode(`${rawHeader}.${rawPayload}`));
  if (!valid) throw new Error("firma");

  const now = Math.floor(Date.now() / 1000);
  const projectId = env.FIREBASE_PROJECT_ID;
  const allowed = (env.ALLOWED_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  if (payload.aud !== projectId || payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error("proyecto");
  if (!payload.sub || payload.exp <= now || payload.iat > now + 300) throw new Error("vencido");
  if (!allowed.includes(String(payload.email || "").toLowerCase())) throw new Error("usuario");
  return payload;
}

async function firebaseKeys() {
  if (cachedKeys && cachedKeys.expires > Date.now()) return cachedKeys.keys;
  const response = await fetch(FIREBASE_KEYS_URL);
  if (!response.ok) throw new Error("claves");
  const maxAge = Number(/max-age=(\d+)/.exec(response.headers.get("Cache-Control") || "")?.[1] || 3600);
  cachedKeys = { keys: (await response.json()).keys || [], expires: Date.now() + maxAge * 1000 };
  return cachedKeys.keys;
}

function decodeBytes(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

function decodeText(value) {
  return new TextDecoder().decode(decodeBytes(value));
}

// --- Respuestas ---------------------------------------------------------------

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((item) => item.trim()).filter(Boolean);
  if (!origin || !allowed.includes(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json; charset=utf-8" } });
}
