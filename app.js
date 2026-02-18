const API_URL = "https://7103.api.greenapi.com";

// ВПИШИ СЮДА СВОИ ДАННЫЕ (если хочешь, чтобы они были "прописаны в коде"):
const DEFAULT_ID_INSTANCE = "71";
const DEFAULT_API_TOKEN_INSTANCE = "037";

const el = (id) => document.getElementById(id);

const idInstanceEl = el("idInstance");
const tokenEl = el("apiTokenInstance");
const outEl = el("output");
const statusEl = el("status");

const btnGetSettings = el("btnGetSettings");
const btnGetState = el("btnGetState");
const btnSendMessage = el("btnSendMessage");
const btnSendFile = el("btnSendFile");

window.addEventListener("DOMContentLoaded", () => {
  if (DEFAULT_ID_INSTANCE && DEFAULT_ID_INSTANCE !== "Заполните ID instance") {
    idInstanceEl.value = DEFAULT_ID_INSTANCE;
  }
  if (DEFAULT_API_TOKEN_INSTANCE && DEFAULT_API_TOKEN_INSTANCE !== "Заполните token") {
    tokenEl.value = DEFAULT_API_TOKEN_INSTANCE;
  }
});

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function pretty(obj) {
  return JSON.stringify(obj, null, 2);
}

function parseMaybeJson(text) {
  try { return JSON.parse(text); } catch { return text; }
}

function requireCreds() {
  const idInstance = (idInstanceEl.value || "").trim();
  const apiTokenInstance = (tokenEl.value || "").trim();
  if (!idInstance || !apiTokenInstance) throw new Error("Заполни idInstance и ApiTokenInstance");
  return { idInstance, apiTokenInstance };
}

function toChatId(input) {
  const raw = (input || "").trim();
  if (!raw) return null;
  if (raw.includes("@")) return raw;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return `${digits}@c.us`;
}

function endpoint({ idInstance, apiTokenInstance }, methodName) {
  return `${API_URL}/waInstance${idInstance}/${methodName}/${apiTokenInstance}`;
}

async function callApi({ httpMethod, methodName, payload }) {
  let creds;
  try {
    creds = requireCreds();
  } catch (e) {
    outEl.value = pretty({ error: e.message });
    setStatus("error");
    return;
  }

  const url = endpoint(creds, methodName);
  setStatus("working...");

  let res, text;
  try {
    const options = { method: httpMethod, headers: {} };
    if (payload) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(payload);
    }
    res = await fetch(url, options);
    text = await res.text();
  } catch (e) {
    outEl.value = pretty({ request: { httpMethod, url, payload }, error: e.message || String(e) });
    setStatus("error");
    return;
  }

  outEl.value = pretty({
    request: { httpMethod, url, payload: payload ?? null },
    response: { ok: res.ok, status: res.status, statusText: res.statusText, body: parseMaybeJson(text) }
  });

  setStatus(res.ok ? "ok" : "error");
}

// getSettings
btnGetSettings.addEventListener("click", () => {
  callApi({ httpMethod: "GET", methodName: "getSettings" });
});

// getStateInstance
btnGetState.addEventListener("click", () => {
  callApi({ httpMethod: "GET", methodName: "getStateInstance" });
});

// sendMessage
btnSendMessage.addEventListener("click", () => {
  const chatId = toChatId(el("to").value);
  const message = (el("message").value || "").trim();

  if (!chatId) {
    outEl.value = pretty({ error: "Заполни номер получателя для sendMessage" });
    setStatus("error");
    return;
  }
  if (!message) {
    outEl.value = pretty({ error: "Заполни текст сообщения для sendMessage" });
    setStatus("error");
    return;
  }

  callApi({
    httpMethod: "POST",
    methodName: "sendMessage",
    payload: { chatId, message }
  });
});

// sendFileByUrl
btnSendFile.addEventListener("click", () => {
  const chatId = toChatId(el("toFile").value);
  const urlFile = (el("urlFile").value || "").trim();

  if (!chatId) {
    outEl.value = pretty({ error: "Заполни номер получателя для sendFileByUrl" });
    setStatus("error");
    return;
  }
  if (!urlFile) {
    outEl.value = pretty({ error: "Заполни urlFile для sendFileByUrl" });
    setStatus("error");
    return;
  }

  // fileName обязателен по документации, но мы вычисляем его из URL автоматически
  let fileName = "file";
  try {
    const u = new URL(urlFile);
    fileName = u.pathname.split("/").filter(Boolean).pop() || "file";
  } catch {}

  callApi({
    httpMethod: "POST",
    methodName: "sendFileByUrl",
    payload: { chatId, urlFile, fileName }
  });
});
