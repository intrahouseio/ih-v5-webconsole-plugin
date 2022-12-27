const EventEmitter = require('events');
const spawn = require('child_process').spawn;
const os = require('os');

const ls = spawn('ls', ['-lh', '/usr']);

class Spawn extends EventEmitter {
  constructor(opt) {
    super();

    this.isWindows = os.platform() === 'win32';
    
    if (this.isWindows) {
      this.pty = spawn();
    } else {
      this.pty = require('node-pty-prebuilt-multiarch').spawn('sudo', ['login'], opt);
      this.pty.on('data', data => {
        if (this.pty !== null) {
          this.emit('data', data);
        }
      });
    }
  }

  write(data) {
    if (this.pty !== null) {
      if (this.isWindows) {

      } else {
        this.pty.write(data);
      }
    }
  }

  destroy() {
    if (this.pty !== null) {
      if (this.isWindows) {

      } else {
        this.pty.destroy();
      }
      this.isWindows = null;
      this.pty = null;
    }
  }
}

function spawn(opt) {
  return new Spawn(opt);
}

module.exports = {
  spawn,
}