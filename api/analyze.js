export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { base64Data, mimeType } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    if (!base64Data || !mimeType) {
      return res.status(400).json({ error: 'Missing base64Data or mimeType' });
    }

    const prompt = `Analyze this document and return ONLY valid JSON (no markdown, no extra text):
{
  "title": "document title (max 50 chars)",
  "description": "1-2 sentence description",
  "category": "one of: Жилье, Финансы, Работа, Идентификация, Медицина",
  "tags": ["array", "of", "relevant", "tags"],
  "actions": ["what to do", "important info"],
  "content": "brief summary of content"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Gemini API error:', error);
      return res.status(response.status).json({
        error: `Gemini API returned ${response.status}`,
        details: error.substring(0, 500),
      });
    }

    const data = await response.json();

    if (!data.candidates?.?.content?.parts?.?.text) {
      return res
        .status(400)
        .json({ error: 'No valid response from Gemini' });
    }

    const text = data.candidates.content.parts.text;
    
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(400).json({
        error: 'Could not extract JSON from response',
        received: text.substring(0, 200),
      });
    }

    const result = JSON.parse(jsonMatch);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Backend error:', error);
    return res.status(500).json({
      error: error.message,
      type: error.constructor.name,
    });
  }
}
