const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        icon: path.join(__dirname, 'public/palpueblo.png'),
        autoHideMenuBar: true,
    });

    // Handle file opening from arguments
    const handleFileArg = () => {
        const args = process.argv;
        const filePath = args.find(arg => arg.endsWith('.lock'));
        if (filePath && fs.existsSync(filePath)) {
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                win.webContents.send('open-file-data', { content });
            } catch (err) {
                console.error("Error reading file from args", err);
            }
        }
    };

    // Load the web app
    const isDev = !app.isPackaged;
    if (isDev) {
        win.loadURL('http://localhost:5173');
        win.webContents.on('did-finish-load', handleFileArg);
        // Handle error if dev server is not running
        win.webContents.on('did-fail-load', () => {
            win.loadURL(`data:text/html,<html><body style="background:#1a1a1a;color:white;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;">
        <h1>⚠️ Servidor no encontrado</h1>
        <p>Por favor, usa <b>npm run electron:dev</b> para iniciar la aplicación.</p>
        <button onclick="location.reload()" style="padding:10px 20px;cursor:pointer;">Reintentar</button>
      </body></html>`);
        });
    } else {
        win.loadFile(path.join(__dirname, 'dist/index.html')).then(handleFileArg);
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
