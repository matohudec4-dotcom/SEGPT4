export default async function handler(req, res) {
  // ─── 1) Vstup a sanitácia ────────────────────────────────────────────────
  const raw = decodeURIComponent(req.query.prompt || "").toString().slice(0, 600);
  // odstráň @tagy a extra medzery
  const prompt = raw.replace(/@\w+/g, "").replace(/\s+/g, " ").trim();
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).send("❌ OPENAI_API_KEY chýba vo Vercel → Settings → Environment Variables.");
  }

  // ─── 2) Konfig cez ENV (ľahko si doladíš bez redeployu kódu) ─────────────
  const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const LANG = process.env.BOT_LANG || "sk";           // "sk" | "cz" | "en"
  const MAX_CHARS = Number(process.env.MAX_CHARS || 180); // bezpečná dĺžka pre chat
  const TONE = process.env.BOT_TONE || "vtipný, priateľský, stručný";
  const STREAMER = process.env.STREAMER_NAME || "streamer";
  const GAME = process.env.STREAM_GAME || "Twitch";
  const SAFE = (s) =>
    s.replace(/https?:\/\/\S+/gi, "[link]").replace(/(.+)\1{2,}/g, "$1"); // odstráni linky a opakovania

  // Menší “rozum” pre otázky: ak začína na ? alebo obsahuje “prečo/ako”, skús nižšiu kreativitu
  const isQuestion = /^[\s]*\?/.test(prompt) || /(prečo|ako|what|why|how)/i.test(prompt);
  const temperature = isQuestion ? 0.3 : Number(process.env.TEMPERATURE || 0.5);

  // ─── 3) Systémová rola (persona) ────────────────────────────────────────
  const systemPrompt = [
    `Si Twitch co-host bota kanála ${STREAMER}.`,
    `Hovor jazykom: ${LANG}. Buď ${TONE}. Max ${MAX_CHARS} znakov.`,
    `Buď stručný (1–2 vety), bez odsekov, bez #, bez @mention.`,
    `Ak sa pýtajú na pravidlá alebo info o streame, odpovedz stručne a pomocne.`,
    `Žiadne vymýšľanie faktov. Keď niečo nevieš, povedz to priamo.`,
    `Ak je dopyt toxický/NSFW/spam, zdvorilo odmietni a navrhni inú tému.`,
    `Kontext: hráme ${GAME}, komunita je priateľská, humor OK, ale slušne.`
  ].join(" ");

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt || "Pozdrav chat a predstav sa jednou vetou." }
        ],
        max_tokens: 120,
        temperature
      })
    });

    const data = await r.json();
    if (!r.ok) {
      const code = data?.error?.code || r.status;
      const msg = data?.error?.message || "Neznáma chyba OpenAI.";
      return res.status(500).send(`🤖 Chyba pri generovaní (${code}): ${msg}`);
    }

    let out = (data?.choices?.[0]?.message?.content || "").trim();
    if (!out) out = "Hmm, skús to inak. 🙂";
    // skráť a vyčisti výstup pre chat
    out = SAFE(out).slice(0, MAX_CHARS);
    return res.status(200).send(out);
  } catch (e) {
    return res.status(500).send("❌ Server error – skontroluj Logs v Vercel Deployments.");
  }
}

