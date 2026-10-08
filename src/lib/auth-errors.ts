export type SignInErrorLike = { status?: number; code?: string; message?: string };

/**
 * Maps a Supabase sign-in error to a message the user can act on. Wrong credentials stay generic on
 * purpose (no account enumeration); configuration and connectivity problems must not be disguised as
 * a wrong password, otherwise a bad API key looks like a typo.
 */
export function describeSignInError(error: SignInErrorLike): string {
  const { status, code, message = "" } = error;

  if (code === "email_not_confirmed") {
    return "Dieses Konto ist noch nicht bestätigt. In Supabase unter Authentication → Users bestätigen oder mit „Auto Confirm User“ neu anlegen.";
  }
  if (code === "invalid_credentials" || (status === 400 && /invalid login credentials/i.test(message))) {
    return "E-Mail oder Passwort stimmt nicht.";
  }
  if (status === 401 || status === 403 || /invalid api key/i.test(message)) {
    return "Supabase lehnt den API-Key ab (Invalid API key). NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY müssen aus demselben Supabase-Projekt stammen. Danach in Vercel neu deployen.";
  }
  if (status === 429) {
    return "Zu viele Anmeldeversuche. Bitte kurz warten und nochmals versuchen.";
  }
  if (!status || status >= 500) {
    return "Anmeldung gerade nicht möglich (Verbindung?). Bitte gleich nochmals versuchen.";
  }
  return `Anmeldung abgelehnt (${code ?? `HTTP ${status}`}).`;
}
