import { ipcMain } from 'electron';

class Logger {
  constructor() {
    this.mainWindow = null;
  }

  setMainWindow(window) {
    this.mainWindow = window;
  }

  log(message, type = 'info') {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('new-log', { message, type });
    }
    console.log(`[${type}] ${message}`);
  }

  error(message) {
    this.log(message, 'error');
  }

  info(message) {
    this.log(message, 'info');
  }

  debug(message) {
    this.log(message, 'debug');
  }
}

// Create a singleton instance
const logger = new Logger();

// Handle IPC messages from renderer processes
ipcMain.on('log-event', (event, message) => {
  logger.log(message);
});

export default logger; 