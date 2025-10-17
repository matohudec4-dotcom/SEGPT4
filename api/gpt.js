export default async function handler(req, res) {
  const prompt = (req.query.prompt || "Ahoj!").toString().slice(0, 400);
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).send("❌ OPENAI_API_KEY chýba vo Vercel → Settings → Environment Variables.");
  }
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Si vtipný Twitch chatbot, odpovedáš stručne, faktami a zábavne. Nepíš viac než 180 znakov." },
          { role: "user", content: prompt }
        ],
        max_tokens: 100,
        temperature: 0.7
      })
    });
    const data = await r.json();
    if (!r.ok) {
      // ukáž priateľskú chybu z OpenAI bez citlivých dát
      const code = data?.error?.code || r.status;
      const msg = data?.error?.message || "Neznáma chyba OpenAI.";
      return res.status(500).send(`🤖 Chyba pri generovaní (${code}): ${msg}`);
    }
    const msg = data?.choices?.[0]?.message?.content?.trim();
    return res.status(200).send(msg || "🤖 Nič som nevymyslel, skús iný prompt.");
  } catch (e) {
    return res.status(500).send("❌ Server error – skontroluj logs v Vercel Deployments.");
  }
}
