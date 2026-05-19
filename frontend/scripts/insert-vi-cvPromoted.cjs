const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '../src/translations/translations.js');
let s = fs.readFileSync(p, 'utf8');
const needle =
  "    cvStatus: 'Tr\u1ea1ng th\u00e1i h\u1ed3 s\u01a1',\n" +
  "    createdDate: 'Ng\u00e0y t\u1ea1o h\u1ed3 s\u01a1',";
const withInsert =
  "    cvStatus: 'Tr\u1ea1ng th\u00e1i h\u1ed3 s\u01a1',\n" +
  "    cvPromotedInactiveShort: 'T\u1ea1m kh\xf4ng kh\u1ea3 d\u1ee5ng',\n" +
  "    createdDate: 'Ng\u00e0y t\u1ea1o h\u1ed3 s\u01a1',";
if (!s.includes(needle)) {
  if (s.includes('cvPromotedInactiveShort:') && s.indexOf('vi:') < s.indexOf('cvPromotedInactiveShort'))
    console.log('skip: vi may already have key');
  throw new Error('needle missing');
}
if (s.includes(withInsert.split('\n')[1])) {
  console.log('already patched');
  process.exit(0);
}
s = s.replace(needle, withInsert);
fs.writeFileSync(p, s, 'utf8');
console.log('ok');
