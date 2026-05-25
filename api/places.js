module.exports = async function handler(req, res) {
  const { action, url, query, place_id, ref, maxwidth, location, radius, keyword, lat, lng } = req.query;
  const KEY = process.env.GOOGLE_MAPS_API_KEY;

  if (!KEY) {
    return res.status(500).json({ error: 'GOOGLE_MAPS_API_KEY não configurada' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // resolve_url
    if (action === 'resolve_url') {
      let expanded = url;
      if (url.includes('goo.gl') || url.includes('maps.app')) {
        const r = await fetch(url, { method: 'HEAD', redirect: 'follow' });
        expanded = r.url;
      }
      const nameMatch = expanded.match(/place\/([^/@?]+)/);
      const searchTerm = nameMatch ? decodeURIComponent(nameMatch[1].replace(/\+/g, ' ')) : null;

      if (!searchTerm) {
        return res.status(400).json({ error: 'Não foi possível extrair o lugar desta URL. Use "Por Nome + Cidade".' });
      }

      const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(searchTerm)}&inputtype=textquery&fields=place_id,name,formatted_address&key=${KEY}`;
      const searchResp = await fetch(searchUrl);
      const searchData = await searchResp.json();

      if (searchData.candidates && searchData.candidates.length > 0) {
        return res.json({ place_id: searchData.candidates[0].place_id });
      }
      return res.status(404).json({ error: 'Lugar não encontrado. Use "Por Nome + Cidade".' });
    }

    // search
    if (action === 'search') {
      const apiUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id,name,formatted_address,geometry,rating,user_ratings_total&key=${KEY}`;
      const resp = await fetch(apiUrl);
      const data = await resp.json();
      return res.json(data);
    }

    // details
    if (action === 'details') {
      const fields = 'place_id,name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,reviews,photos,opening_hours,business_status,geometry,types,price_level,editorial_summary';
      const apiUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=${fields}&language=pt-BR&key=${KEY}`;
      const resp = await fetch(apiUrl);
      const data = await resp.json();
      return res.json(data);
    }

    // nearby
    if (action === 'nearby') {
      const [lat2, lng2] = location.split(',');
      const apiUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat2},${lng2}&radius=${radius}&keyword=${encodeURIComponent(keyword)}&language=pt-BR&key=${KEY}`;
      const resp = await fetch(apiUrl);
      const data = await resp.json();
      return res.json(data);
    }

    // photo
    if (action === 'photo') {
      const w = maxwidth || '600';
      const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${w}&photo_reference=${ref}&key=${KEY}`;
      const resp = await fetch(photoUrl);
      const buffer = await resp.arrayBuffer();
      res.setHeader('Content-Type', resp.headers.get('content-type') || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(Buffer.from(buffer));
    }

    // streetview
    if (action === 'streetview') {
      const svUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x300&location=${lat},${lng}&fov=90&pitch=0&key=${KEY}`;
      const resp = await fetch(svUrl);
      const buffer = await resp.arrayBuffer();
      res.setHeader('Content-Type', resp.headers.get('content-type') || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(Buffer.from(buffer));
    }

    return res.status(400).json({ error: `Ação desconhecida: ${action}` });

  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: 'Erro interno: ' + err.message });
  }
}
