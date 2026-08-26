const fs = require('fs');

try {
  const data = JSON.parse(fs.readFileSync('security-audit/findings.json', 'utf8'));
  console.log("JSON parsed successfully.", data.length, "findings.");
} catch (e) {
  console.error("JSON parse error", e);
}
