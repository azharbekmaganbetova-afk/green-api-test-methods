const API_URL = "https://7103.api.greenapi.com";

// мои дефолтные переменные значения для локального теста 
const DEFAULT_ID_INSTANCE = "";
const DEFAULT_API_TOKEN_INSTANCE = "";


function el(id) {
  return document.getElementById(id);
}

// кнопки
const idInstanceEl = el("idInstance");           // input для idInstance
const tokenEl = el("apiTokenInstance");          // input для apiTokenInstance
const outEl = el("output");                      // textarea для результата
const statusEl = el("status");                   // статус ok/error/wait
const btnGetSettings = el("btnGetSettings");     
const btnGetState = el("btnGetState");           
const btnSendMessage = el("btnSendMessage");     
const btnSendFile = el("btnSendFile");           

// для себя
window.addEventListener("ContentLoaded", () => {
  if (DEFAULT_ID_INSTANCE) {
    idInstanceEl.value = DEFAULT_ID_INSTANCE;
  }
  if (DEFAULT_API_TOKEN_INSTANCE) {
    tokenEl.value = DEFAULT_API_TOKEN_INSTANCE;
  }
});

// 6) Показываем статус пользователю
function setStatus(text) {
  if (statusEl) statusEl.textContent = text; // статус пишем прямо в DOM
}

// 7) Красиво форматируем объект в JSON (для textarea)
function pretty(obj) {
  return JSON.stringify(obj, null, 2);
}

// 8) Иногда API возвращает JSON, иногда plain text — попробуем распарсить
function parseMaybeJson(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
}

// 9) Проверяем, что пользователь ввел idInstance и token
function getCredsOrThrow() {
  const idInstance = (idInstanceEl.value || "").trim();       // читаем и убираем пробелы
  const apiTokenInstance = (tokenEl.value || "").trim();

  // если чего-то нет — бросаем ошибку (вызовем её выше)
  if (!idInstance || !apiTokenInstance) {
    throw new Error("Заполни idInstance и ApiTokenInstance");
  }

  // возвращаем объект с данными
  return { idInstance, apiTokenInstance };
}

// нормализация вида chatId. ex: 77001234567@c.us
function toChatId(input) {
  const raw = (input || "").trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, ""); //вытащим цифры из строки
  if (!digits) return null;
  return `${digits}@c.us`; // суффикс WhatsApp
}

// URL endpoint идол: https://7103.api.greenapi.com/waInstance{ID}/getSettings/{TOKEN}
function buildUrl(creds, methodName) {
  return `${API_URL}/waInstance${creds.idInstance}/${methodName}/${creds.apiTokenInstance}`;
}

// функция fetch на нужный метод и результат в output
async function callApi(httpMethod, methodName, payload) {
  // try получить креды
  let creds;
  try {
    creds = getCredsOrThrow();
  } catch (e) {
    // кредов нет — ошибкa
    outEl.value = pretty({ error: e.message });
    setStatus("error");
    return;
  }
  // конечный URL
  const url = buildUrl(creds, methodName);
  setStatus("wait...");
  const options = {
    method: httpMethod,
    headers: {}
  };

  // payload — POST с JSON
  if (payload) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(payload);
  }

  // запрос
  let res;
  let text;
  try {
    res = await fetch(url, options);   
    text = await res.text();           
  } catch (e) {
    outEl.value = pretty({
      request: { httpMethod, url, payload: payload ?? null },
      error: e.message || String(e)
    });
    setStatus("error");
    return;
  }

  // вывод для видео
  outEl.value = pretty({
    request: {
      httpMethod,
      url,
      payload: payload ?? null
    },
    response: {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      body: parseMaybeJson(text)
    }
  });

  // статус
  setStatus(res.ok ? "ok" : "error");
}

// Обработчики

// GET getSettings
btnGetSettings.addEventListener("click", () => {
  callApi("GET", "getSettings", null);
});

// GET getStateInstance
btnGetState.addEventListener("click", () => {
  callApi("GET", "getStateInstance", null);
});

// POST sendMessage
btnSendMessage.addEventListener("click", () => {
  // данные из формы
  const toValue = el("to").value;
  const chatId = toChatId(toValue);
  const message = (el("message").value || "").trim();

  // валидация 
  if (!chatId) {
    outEl.value = pretty({ error: "Заполни номер получателя (chatId)" });
    setStatus("error");
    return;
  }
  if (!message) {
    outEl.value = pretty({ error: "Заполни текст сообщения" });
    setStatus("error");
    return;
  }

  // отправка запроса
  callApi("POST", "sendMessage", {
    chatId: chatId,
    message: message
  });
});

// POST sendFileByUrl
btnSendFile.addEventListener("click", () => {
  // номер и ссылку
  const toFileValue = el("toFile").value;
  const chatId = toChatId(toFileValue);
  const urlFile = (el("urlFile").value || "").trim();

  // валидация
  if (!chatId) {
    outEl.value = pretty({ error: "Заполни номер получателя" });
    setStatus("error");
    return;
  }
  if (!urlFile) {
    outEl.value = pretty({ error: "Заполни urlFile" });
    setStatus("error");
    return;
  }

  // 16.3) fileName в документации часто обязателен.
  // имя файла из URL .../c.png -> c.png
  let fileName = "file";
  try {
    const u = new URL(urlFile); 
    const last = u.pathname.split("/").filter(Boolean).pop();
    fileName = last || "file";
  } catch (e) {
  }

  // отправка запроса
  callApi("POST", "sendFileByUrl", {
    chatId: chatId,
    urlFile: urlFile,
    fileName: fileName
  });
});
