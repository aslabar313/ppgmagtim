// Speak text in Indonesian using Web Speech API
export function speak(text: string, opts?: { rate?: number; pitch?: number; lang?: string }) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = opts?.lang ?? "id-ID";
    u.rate = opts?.rate ?? 0.95;
    u.pitch = opts?.pitch ?? 1.1;
    window.speechSynthesis.speak(u);
  } catch {
    // ignore
  }
}

export function stopSpeaking() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
}
