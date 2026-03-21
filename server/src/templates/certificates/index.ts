import * as classicGold from './classic-gold';
import * as modernBlue from './modern-blue';
import * as elegantDark from './elegant-dark';
import * as natureGreen from './nature-green';
import * as minimalMono from './minimal-mono';

export interface CertificateData {
  recipientName: string;
  courseName: string;
  issueDate: string;
  certificateId: string;
  points: number;
  verifyUrl: string;
}

interface Template {
  key: string;
  name: string;
  render: (data: CertificateData) => string;
}

export const templates: Template[] = [
  { key: classicGold.TEMPLATE_KEY, name: classicGold.TEMPLATE_NAME, render: classicGold.render },
  { key: modernBlue.TEMPLATE_KEY, name: modernBlue.TEMPLATE_NAME, render: modernBlue.render },
  { key: elegantDark.TEMPLATE_KEY, name: elegantDark.TEMPLATE_NAME, render: elegantDark.render },
  { key: natureGreen.TEMPLATE_KEY, name: natureGreen.TEMPLATE_NAME, render: natureGreen.render },
  { key: minimalMono.TEMPLATE_KEY, name: minimalMono.TEMPLATE_NAME, render: minimalMono.render },
];

export const templateMap = new Map(templates.map(t => [t.key, t]));

export function renderCertificate(templateKey: string, data: CertificateData): string {
  const tpl = templateMap.get(templateKey);
  if (!tpl) throw new Error(`Unknown certificate template: ${templateKey}`);
  return tpl.render(data);
}
