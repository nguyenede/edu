const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = false;
const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

const PORT = 3003;

app.prepare()
  .then(() => {
    const server = createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    });

    server.listen(PORT, (err) => {
      if (err) throw err;
      console.log(`> Next.js production server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Error starting Next.js custom server:', err);
    process.exit(1);
  });
