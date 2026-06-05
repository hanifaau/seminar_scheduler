const { execSync } = require('child_process');
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('to_delete.json', 'utf8'));
const args = JSON.stringify(data).replace(/"/g, '\\"');
const result = execSync('npx convex run delete_temp:deleteSchedules --prod "' + args + '"');
console.log(result.toString());
