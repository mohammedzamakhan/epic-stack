const { validateInstanceUrl } = require('./packages/security/src/ssrf.js'); // Not easily requireable because of TypeScript
console.log(validateInstanceUrl("http://127.1"));
