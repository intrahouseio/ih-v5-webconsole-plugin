const fs = require('fs');
const path = require('path');
const os = require('os');

const pty = (os.platform() === 'win32' && process.versions.modules === '108') ? require('node-pty') : require('node-pty-prebuilt-multiarch');

const logger = require('./lib/logger');

const sessions = {};

const hash_map = { sudo: true };

function statFollowLinks() {
  return fs.statSync.apply(fs, arguments);
}

function splitPath(p) {
  return p ? p.split(path.delimiter) : [];
}

function checkPath(pathName) {
  return fs.existsSync(pathName) && !statFollowLinks(pathName).isDirectory();
}

let isExistSudoCommand = false;

if (os.platform() !== 'win32') {
  const initArray = Object.keys(hash_map);
  const pathArray = splitPath(process.env.PATH);
  
  for (const init of initArray) {
    for (const p of pathArray) {
      const attempt = path.resolve(p, init);
      const check = checkPath(attempt);
  
      if (isExistSudoCommand === false && check) {
        isExistSudoCommand = hash_map[init]
      }
    }
  }
}

const shell = os.platform() === 'win32' ? 'powershell.exe' : (isExistSudoCommand ? 'sudo' : 'login');
const shell_opt = os.platform() === 'win32' ? [] : (isExistSudoCommand ? ['login'] : []);

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
  
        sessions[uuid] = pty.spawn(shell, shell_opt, {
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