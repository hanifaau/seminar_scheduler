const https = require('https');
https.get('https://seminar-scheduler-one.vercel.app/', (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    const jsMatches = data.match(/src="([^"]+\.js)"/g) || [];
    jsMatches.forEach(m => {
      const src = m.match(/src="([^"]+)"/)[1];
      const url = src.startsWith('http') ? src : 'https://seminar-scheduler-one.vercel.app' + (src.startsWith('/') ? '' : '/') + src;
      https.get(url, (res2) => {
        let jsData = '';
        res2.on('data', d => jsData += d);
        res2.on('end', () => {
          const convexUrlMatch = jsData.match(/https:\/\/[a-z0-9-]+\.convex\.cloud/g);
          if (convexUrlMatch) {
            console.log('Found in', src, ':', [...new Set(convexUrlMatch)]);
          }
        });
      });
    });
  });
});
