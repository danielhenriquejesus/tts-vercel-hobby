const VOICE_MAP = {
  antonio: "alloy",
  thalita: "nova",
  francisca: "sage",
};

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST,OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    let body = req.body;

    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }

    const { text, voiceId, speed } = body || {};

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Campo 'text' é obrigatório" });
    }

    const openaiVoice = VOICE_MAP[voiceId] || VOICE_MAP.antonio;
    const clampedSpeed = Math.min(4, Math.max(0.25, Number(speed) || 1));

    const apiRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: openaiVoice,
        input: text,
        response_format: "mp3",
        speed: clampedSpeed,
      }),
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text().catch(() => "");
      console.error("OpenAI TTS error:", apiRes.status, errText);
      return res.status(500).json({ error: "Erro ao gerar áudio TTS" });
    }

    const arrayBuffer = await apiRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader(
      "Content-Disposition",
      'inline; filename="tts-openai.mp3"'
    );
    return res.status(200).send(buffer);
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Erro interno no servidor TTS" });
  }
};

