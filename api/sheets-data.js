// Vercel Serverless Function: Google Sheets 데이터 불러오기
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sheetId = process.env.GOOGLE_SHEETS_ID;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY; // Maps API 키로 Sheets도 조회 가능

  if (!sheetId) {
    return res.status(500).json({ error: 'GOOGLE_SHEETS_ID 환경변수 미설정' });
  }

  try {
    const range = req.query.range || 'Sheet1!A1:Z100';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    res.status(200).json({
      success: true,
      values: data.values || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
