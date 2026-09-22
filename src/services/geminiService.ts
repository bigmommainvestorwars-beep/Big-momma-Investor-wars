export async function fetchGeminiAdvisorAdvice(prompt?: string, matchContext?: any): Promise<string> {
  try {
    const res = await fetch('/api/gemini-advisor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, matchContext }),
    });

    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }

    const data = await res.json();
    return data.advice || 'Maintain strong liquidity and monitor aggressive opponents during corporate auctions.';
  } catch (err) {
    console.warn('Failed to fetch Gemini advisor advice:', err);
    return 'Strategic AI Advisor unavailable. Keep cash reserves high and prioritize high-dividend assets.';
  }
}
