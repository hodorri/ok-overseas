// Vercel Serverless Function: 데이터 저장 (현재 미사용 - 구글 스프레드시트로 대체 예정)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(200).json({ success: true, message: 'localStorage에 저장됨 (DB 미연동)' });
}
