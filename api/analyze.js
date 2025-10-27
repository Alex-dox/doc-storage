// api/analyze.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { base64Data, mimeType } = req.body;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Секретная переменная

  const prompt = `Проанализируй этот документ и верни JSON со следующими полями:
- title: краткое название документа (до 50 символов)
- description: краткое описание (1-2 предложения)
- category: выбери одну категорию из: Жилье, Финансы, Работа, Идентификация, Медицина
- tags: массив релевантных тегов из: CAF, CADA, OFPRA, ANEF, France Travail, Credit Mutuel
- actions: массив важной информации (коды, даты, что нужно сделать)
- content: краткое резюме основного содержания
Верни только валидный JSON без дополнительного текста.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64Data } }
            ]
          }]
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Gemini API Error:', error);
      return res.status(response.status).json(error);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(400).json({ error: 'No JSON found in response' });
    }

    const result = JSON.parse(jsonMatch[0]);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
