const { execSync } = require('child_process');
const output = execSync('npx convex run teaching_schedules:getAll --prod', { encoding: 'utf8' });
const schedules = JSON.parse(output.trim());
const withoutGroup = schedules.filter(s => !s.groupId);
const ids = withoutGroup.map(s => s._id);
const chunkSize = 10;
for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const jsonStr = JSON.stringify({ ids: chunk }).replace(/"/g, '\\"');
    execSync(`npx convex run delete_temp:deleteSchedules "${jsonStr}" --prod`);
}
console.log('Deleted ' + ids.length + ' ghost schedules!');
