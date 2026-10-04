import { ageOn } from '../lib/age';

const age = String(ageOn());
document.querySelectorAll('[data-age]').forEach((el) => {
  if (el.textContent !== age) el.textContent = age;
});
