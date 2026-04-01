// Vercel Serverless Function: 실시간 항공권 가격 조회 (Amadeus API)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { origin, destination, date, adults } = req.query;

  if (!origin || !destination || !date) {
    return res.status(400).json({ error: 'origin, destination, date 파라미터 필요' });
  }

  if (!process.env.AMADEUS_CLIENT_ID || !process.env.AMADEUS_CLIENT_SECRET) {
    return res.status(200).json({
      success: false,
      error: 'Amadeus API 키가 설정되지 않았습니다. Vercel 환경변수에 AMADEUS_CLIENT_ID, AMADEUS_CLIENT_SECRET을 추가하세요.',
      flights: [],
    });
  }

  try {
    // 1. Amadeus OAuth 토큰 발급
    const tokenRes = await fetch('https://api.amadeus.com/v1/security/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.AMADEUS_CLIENT_ID,
        client_secret: process.env.AMADEUS_CLIENT_SECRET,
      }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return res.status(500).json({ error: 'Amadeus 인증 실패', detail: tokenData });
    }

    // 2. 항공편 검색
    const searchParams = new URLSearchParams({
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate: date,
      adults: adults || '1',
      nonStop: 'true',
      currencyCode: 'KRW',
      max: '10',
    });

    const flightRes = await fetch(
      `https://api.amadeus.com/v2/shopping/flight-offers?${searchParams}`,
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    const flightData = await flightRes.json();

    // 3. 결과 정리
    const results = (flightData.data || []).map(offer => ({
      price: offer.price?.grandTotal,
      currency: offer.price?.currency,
      airline: offer.validatingAirlineCodes?.[0],
      segments: offer.itineraries?.[0]?.segments?.map(seg => ({
        departure: seg.departure?.iataCode,
        arrival: seg.arrival?.iataCode,
        departureTime: seg.departure?.at,
        arrivalTime: seg.arrival?.at,
        flightNumber: seg.carrierCode + seg.number,
        aircraft: seg.aircraft?.code,
        duration: seg.duration,
      })),
    }));

    res.status(200).json({
      success: true,
      route: `${origin} → ${destination}`,
      date,
      count: results.length,
      flights: results,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
