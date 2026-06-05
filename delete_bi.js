const { execSync } = require('child_process');
const output = execSync('npx convex run teaching_schedules:getAll --prod', { encoding: 'utf8' });
const schedules = JSON.parse(output.trim());
const bi = schedules.filter(s => s.activity.toLowerCase().includes('inggris'));
const ids = bi.map(s => s._id);

const batchSize = 100;
for (let i = 0; i < ids.length; i += batchSize) {
  const batch = ids.slice(i, i + batchSize);
  execSync(`npx convex run delete_temp:deleteSchedules --prod '{"ids": ${JSON.stringify(batch)}}'`);
}
console.log('Successfully deleted ' + bi.length + ' Bahasa Inggris schedules!');
