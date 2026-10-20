/** Date calendaire locale au format AAAA-MM-JJ (sans heure ni fuseau). */
export type IsoDate = string;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Date locale du jour (et non UTC : à 0 h 30 en France on est déjà « demain » en local). */
export function toIsoDate(date: Date): IsoDate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Vérifie qu'une chaîne est une date calendaire réelle (refuse 2027-02-30). */
export function isIsoDate(value: string): value is IsoDate {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** Ajoute des années à une date ISO (le 29 février devient le 28 si besoin). */
export function addYears(date: IsoDate, years: number): IsoDate {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const target = new Date(y + years, m - 1, d);
  if (target.getMonth() !== m - 1) target.setDate(0);
  return toIsoDate(target);
}

/** Nombre de jours entiers entre deux dates ISO (positif si `to` est après `from`). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  const [fy, fm, fd] = from.split('-').map(Number) as [number, number, number];
  const [ty, tm, td] = to.split('-').map(Number) as [number, number, number];
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}
