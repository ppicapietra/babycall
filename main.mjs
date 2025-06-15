import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import express from 'express';
import https from 'https';
import fs from 'fs';
import { WebSocketServer } from 'ws';
import os from 'os';
import qrcode from 'qrcode';
import { fileURLToPath } from 'url';
import wsHandler from './wsHandler.mjs';
import logger from './logger.mjs';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath( import.meta.url );
const __dirname = path.dirname( __filename );

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
	mainWindow = new BrowserWindow( {
		width: 800,
		height: 600,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false
		}
	} );

	mainWindow.loadFile( 'public/server.html' );

	if ( process.env.NODE_ENV === 'development' ) {
		mainWindow.webContents.openDevTools();
	}

	// Set the main window in the logger
	logger.setMainWindow( mainWindow );
}

// Create the Express app
const expressApp = express();

// HTTPS certificates
const privateKey = fs.readFileSync( path.join( __dirname, 'certs/private.key' ) );
const certificate = fs.readFileSync( path.join( __dirname, 'certs/server.crt' ) );
const credentials = {
	key: privateKey,
	cert: certificate,
	minVersion: 'TLSv1.2',
	ciphers: 'HIGH:!aNULL:!MD5'
};

// HTTPS Server
const httpsServer = https.createServer( credentials, expressApp );
const wss = new WebSocketServer( {
	server: httpsServer,
	clientTracking: true,
	verifyClient: ( info, callback ) => {
		logger.debug( `New incoming connection from: ${ info.req.headers.origin }` );
		callback( true );
	}
} );

wss.on( 'connection', ( ws, req ) => {
	wsHandler.onConnection( ws, req );
} );

// Serve static files
expressApp.use( express.static( path.join( __dirname, 'public' ) ) );

// Add route handler for root path
expressApp.get( '/', ( req, res ) => {
	res.sendFile( path.join( __dirname, 'public', 'client.html' ) );
} );

// Function to get local IP
function getLocalIP() {
	const ifaces = os.networkInterfaces();
	for ( let iface in ifaces ) {
		for ( let i = 0; i < ifaces[ iface ].length; i++ ) {
			const ifaceDetails = ifaces[ iface ][ i ];
			if ( ifaceDetails.family === 'IPv4' && !ifaceDetails.internal ) {
				return ifaceDetails.address;
			}
		}
	}
}

const LocalIP = getLocalIP();
const PORT = 3500;

// Start the server when the app is ready
app.whenReady().then( () => {
	createWindow();

	httpsServer.listen( PORT, '0.0.0.0', async () => {
		const URL = `https://${ LocalIP }:${ PORT }`;

		// Generate QR code as data URL
		const qrDataUrl = await qrcode.toDataURL( URL, {
			errorCorrectionLevel: 'H',
			margin: 1,
			width: 200
		} );

		// Send URL and QR code to renderer
		mainWindow.webContents.send( 'server-started', {
			url: URL,
			qrCode: qrDataUrl,
			version: app.getVersion()
		} );
	} );
} );

app.on( 'window-all-closed', () => {
	if ( process.platform !== 'darwin' ) {
		app.quit();
	}
} );

app.on( 'activate', () => {
	if ( BrowserWindow.getAllWindows().length === 0 ) {
		createWindow();
	}
} );

// Handle IPC messages
ipcMain.on( 'log-event', ( event, message ) => {
	mainWindow.webContents.send( 'new-log', message );
} );

// Update error handling to use logger
process.on( 'uncaughtException', err => {
	logger.error( `Uncaught Exception: ${ err.message }` );
} );

process.on( 'unhandledRejection', err => {
	logger.error( `Unhandled Rejection: ${ err.message }` );
} ); 