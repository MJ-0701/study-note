type DatadogRumClient = typeof import("@datadog/browser-rum").datadogRum;

interface RumUser extends Record<string, string> {
  id: string;
  role: string;
}

interface RumActionContext {
  [key: string]: string | number | boolean | undefined;
}

let rumClient: DatadogRumClient | undefined;
let initStarted = false;
let pendingUser: RumUser | undefined;

// RUM application id/client token are public browser SDK values, not Datadog API
// keys. Vercel env remains the override path, but the fallback keeps production
// instrumentation alive if the environment-specific Vite build env is missing.
const FALLBACK_APPLICATION_ID = "ff4758ab-cf93-4aee-99ab-bbe6ac957f6f";
const FALLBACK_CLIENT_TOKEN = "pube4196f9d76def0459684c80bdc4ac9ee";

function envValue(name: string): string | undefined {
  const value = import.meta.env?.[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function envNumber(name: string, fallback: number): number {
  const raw = envValue(name);
  if (!raw) return fallback;

  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function envBoolean(name: string, fallback: boolean): boolean {
  const raw = envValue(name);
  if (!raw) return fallback;

  return raw === "1" || raw.toLowerCase() === "true";
}

export function initializeDatadogRum(): void {
  if (initStarted || typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const applicationId = envValue("VITE_DD_APPLICATION_ID") ?? FALLBACK_APPLICATION_ID;
  const clientToken = envValue("VITE_DD_CLIENT_TOKEN") ?? FALLBACK_CLIENT_TOKEN;

  if (!applicationId || !clientToken) {
    return;
  }

  initStarted = true;

  void import("@datadog/browser-rum")
    .then(({ datadogRum }) => {
      datadogRum.init({
        applicationId,
        clientToken,
        site: envValue("VITE_DD_SITE") ?? "us5.datadoghq.com",
        service: envValue("VITE_DD_SERVICE") ?? "study-note-web",
        env: envValue("VITE_DD_ENV") ?? "production",
        version: envValue("VITE_DD_VERSION"),
        sessionSampleRate: envNumber("VITE_DD_SESSION_SAMPLE_RATE", 100),
        sessionReplaySampleRate: envNumber("VITE_DD_SESSION_REPLAY_SAMPLE_RATE", 0),
        trackResources: envBoolean("VITE_DD_TRACK_RESOURCES", true),
        trackUserInteractions: envBoolean("VITE_DD_TRACK_USER_INTERACTIONS", false),
        trackLongTasks: envBoolean("VITE_DD_TRACK_LONG_TASKS", true),
        defaultPrivacyLevel: "mask-user-input"
      });

      rumClient = datadogRum;
      if (pendingUser) {
        rumClient.setUser(pendingUser);
      }
    })
    .catch(() => {
      initStarted = false;
    });
}

export function setDatadogRumUser(user: RumUser): void {
  pendingUser = {
    id: user.id,
    role: user.role
  };
  rumClient?.setUser(pendingUser);
}

export function clearDatadogRumUser(): void {
  pendingUser = undefined;
  rumClient?.clearUser();
}

export function trackRumAction(name: string, context?: RumActionContext): void {
  rumClient?.addAction(name, context);
}
