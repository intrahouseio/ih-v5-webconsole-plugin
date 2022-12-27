const EventEmitter = require('events');
const spawn = require('child_process').spawn;
const os = require('os');

class Spawn extends EventEmitter {
  constructor(opt) {
    super();

    this.isWindows = os.platform() === 'win32';
    
    if (this.isWindows) {
      this.pty = spawn('./pty/winpty.exe', [opt.cols, opt.rows]);
      this.pty.on('error', err => {
        this.destroy();
      });
      this.pty.stdout.on('data', (data) => {
        if (this.pty !== null) {
          this.emit('data', data.toString());
        }
      });
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
        this.pty.stdin.write(data);
      } else {
        this.pty.write(data);
      }
    }
  }

  destroy() {
    if (this.pty !== null) {
      if (this.isWindows) {
        this.pty.kill('SIGINT');
      } else {
        this.pty.destroy();
      }
      this.isWindows = null;
      this.pty = null;
    }
  }
}

function _spawn(opt) {
  return new Spawn(opt);
}

module.exports = {
  spawn: _spawn,
}