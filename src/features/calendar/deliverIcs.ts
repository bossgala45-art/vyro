import { shareOrDownload } from '../../ui/shareFile';

/** Partage le fichier (feuille de partage iOS) ou, à défaut, le télécharge. */
export function deliverIcs(ics: string, fileName: string, title: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  return shareOrDownload(new File([ics], fileName, { type: 'text/calendar' }), title);
}
