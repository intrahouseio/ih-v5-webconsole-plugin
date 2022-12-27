const path = require('path');
const os = require('os');

const pty = require('pty');

const logger = require('./lib/logger');

const sessions = {};

function sendProcessInfo() {
  const mu = process.memoryUsage();
  const memrss = Math.floor(mu.rss / 1024);
  const memheap = Math.floor(mu.heapTotal / 1024);
  const memhuse = Math.floor(mu.heapUsed / 1024);

  const data = { memrss, memheap, memhuse };

  process.send({ type: 'procinfo', data });
}

function main(options) {
  let opt;
  try {
    opt = JSON.parse(process.argv[2]);
  } catch (e) {
    opt = {};
  }

  const logfile = opt.logfile || path.join(__dirname, 'ih_webconsole.log');
  const loglevel = opt.loglevel || 0;

  logger.start(logfile, loglevel);
  logger.log('Plugin webconsole has started  with args: ' + process.argv[2]);

  setInterval(sendProcessInfo, 10000);

  webconsole(opt);
}

function webconsole(opt) {
  process.on('message', msg => {
    if (typeof msg === 'object' && msg.type === 'transferdata' && msg.method === 'unsub') {
      const uuid = msg.uuid;
      if (sessions[uuid] !== undefined) {
        logger.log(`end session: ${uuid}`)
        sessions[uuid].destroy();
        delete sessions[uuid];
      }
    }

    if (typeof msg === 'object' && msg.type === 'transferdata' && msg.payload !== undefined) {
      const uuid = msg.uuid;
      const data = msg.payload;

      if (data.type === 'start') {
        logger.log(`new session: ${uuid}`)

        const env = Object.assign({}, process.env);
        env['COLORTERM'] = 'truecolor';
  
        sessions[uuid] = pty.spawn({
          name: 'xterm-color',
          cols: data.size.cols,
          rows: data.size.rows,
          cwd: opt.cwd,
          env: env
        });
    
        sessions[msg.uuid].on('data', function(data) {
          process.send({ 
            id: uuid, 
            uuid: uuid, 
            type: 'transferdata', 
            unit: 'webconsole',
            payload: { type: 'data', body: data }, 
          });
        }); 
      }

      if (data.type === 'data') {
        if (sessions[uuid] !== undefined) {
          sessions[uuid].write(data.body);
        }
      }

      if (data.type === 'end') {
        if (sessions[uuid] !== undefined) {
          logger.log(`end session: ${uuid}`)
          sessions[uuid].destroy();
          delete sessions[uuid];
        }
      }
    }
  });
}

main();