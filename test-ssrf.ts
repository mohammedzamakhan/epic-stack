import { validateInstanceUrl } from './packages/security/src/ssrf.ts';
console.log('http://127.1', validateInstanceUrl('http://127.1'));
console.log('https://127.1', validateInstanceUrl('https://127.1'));
console.log('https://0x7f000001', validateInstanceUrl('https://0x7f000001'));
console.log('https://0x7f.0.0.1', validateInstanceUrl('https://0x7f.0.0.1'));
console.log('https://0177.0.0.1', validateInstanceUrl('https://0177.0.0.1'));
console.log('https://localtest.me', validateInstanceUrl('https://localtest.me'));
