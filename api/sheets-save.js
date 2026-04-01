// Vercel Serverless Function: Google Sheets 데이터 저장 (서비스 계정 직접 호출)
import { GoogleAuth } from 'google-auth-library';

function getAuth() {
  const key = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim();
  const email = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
  return new GoogleAuth({
    credentials: { client_email: email, private_key: key },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function getAccessToken() {
  const auth = getAuth();
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

const SPREADSHEET_ID = () => (process.env.GOOGLE_SHEETS_ID || '').trim();

async function sheetsAPI(path, method, body) {
  const token = await getAccessToken();
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID()}`;
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function clearAndWrite(sheetName, headers, rows) {
  // 1) batchClear - range를 body에 넣어 한글 인코딩 문제 회피
  await sheetsAPI('/values:batchClear', 'POST', {
    ranges: [sheetName],
  });
  // 2) batchUpdate - range를 body에 넣어 한글 인코딩 문제 회피
  const values = [headers, ...rows];
  const result = await sheetsAPI('/values:batchUpdate', 'POST', {
    valueInputOption: 'USER_ENTERED',
    data: [{ range: `${sheetName}!A1`, values }],
  });
  return result;
}

async function handleSaveSheet({ sheetName, headers, rows }) {
  if (!sheetName || !headers || !rows) {
    return { success: false, error: 'sheetName, headers, rows 필수' };
  }
  const result = await clearAndWrite(sheetName, headers, rows);
  if (result.error) return { success: false, error: result.error.message || JSON.stringify(result.error) };
  return { success: true, totalUpdatedRows: result.totalUpdatedRows || result.totalUpdatedCells };
}

async function handleSaveBatch({ sheets }) {
  if (!sheets || !Array.isArray(sheets)) {
    return { success: false, error: 'sheets 배열 필수' };
  }
  const results = [];
  for (const sheet of sheets) {
    const r = await handleSaveSheet(sheet);
    results.push({ sheetName: sheet.sheetName, ...r });
  }
  const allOk = results.every(r => r.success);
  return { success: allOk, results };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { action } = req.body;
    let result;
    if (action === 'saveSheet') {
      result = await handleSaveSheet(req.body);
    } else if (action === 'saveBatch') {
      result = await handleSaveBatch(req.body);
    } else {
      result = { success: false, error: `Unknown action: ${action}` };
    }
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
