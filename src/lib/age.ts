// Yaş doğum tarihinden hesaplanır: build sırasında yazılır, tarayıcıda tekrar hesaplanır
// (böylece doğum gününde site yeniden yayınlanmasa da yaş güncellenir).
import { profile } from '../config';

export function ageOn(today: Date = new Date(), birth: string = profile.birthDate): number {
  const [y, m, d] = birth.split('-').map(Number);
  let age = today.getFullYear() - y;
  const beforeBirthday = today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d);
  if (beforeBirthday) age--;
  return age;
}

/** Metindeki {age} yer tutucusunun önü ve arkası */
export function splitAge(text: string): [string, string] {
  const [before, after = ''] = text.split('{age}');
  return [before, after];
}

export const fillAge = (text: string, age = ageOn()) => text.replace('{age}', String(age));
