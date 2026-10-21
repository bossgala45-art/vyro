/** Accès à l'environnement Node depuis les tests (le code de l'app n'a pas les types Node). */
const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env;

export function getTimezone(): string | undefined {
  return env.TZ;
}

/** Change le fuseau horaire des tests : Node relit `TZ` à chaque modification. */
export function setTimezone(timezone: string | undefined): void {
  if (timezone === undefined) delete env.TZ;
  else env.TZ = timezone;
}
