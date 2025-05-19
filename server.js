const express = require( 'express' );
const http = require( 'http' );
const https = require( 'https' );
const fs = require( 'fs' );
const WebSocket = require( 'ws' );
const os = require( 'os' );
const path = require( 'path' );
const qrcode = require('qrcode-terminal');
const wsHandler = require( './wsHandler' );
const { debug } = require( './utils' );
const app = express();
const VERSION = require( './package.json' ).version;
// HTTPS certificates
const privateKey = fs.readFileSync(path.join(__dirname, 'certs/private.key'));
const certificate = fs.readFileSync(path.join(__dirname, 'certs/server.crt'));
const credentials = {
  key: privateKey,
  cert: certificate,
  // Add additional security options
  minVersion: 'TLSv1.2',
  ciphers: 'HIGH:!aNULL:!MD5'
};

// HTTPS Server
const httpsServer = https.createServer( credentials, app );
const wss = new WebSocket.Server( {
  server: httpsServer,
  // Additional WebSocket configuration
  clientTracking: true,
  verifyClient: ( info, callback ) => {
    debug( `New incoming connection from: ${ info.req.headers.origin }` );
    callback( true ); // Accept all connections
  }
} );

wss.on( 'connection', ( ws, req ) => {
  wsHandler.onConnection( ws, req );
} );

// Serve static files
app.use( express.static( path.join(__dirname, 'public') ) );

// HTTP to HTTPS redirect
const redirectApp = express();
redirectApp.use( ( req, res ) => {
  res.redirect( 'https://' + req.headers.host.replace( /:\d+$/, `:${ PORT }` ) + req.url );
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

// Start servers
httpsServer.listen( PORT, '0.0.0.0', () => {
  const URL = `https://${ LocalIP }:${ PORT }`;
  console.log( `\n\n` );
  console.log( `### BABY-CALL APP (v${ VERSION }) ###` );
  console.log( `\n\n` );
  console.log( `You can open the webApp from here: ${ URL }` );
  console.log( `Or you can scan this QR code with your phone:` );
  qrcode.generate( URL, { small: true } );
} );

// HTTP to HTTPS redirection server
redirectApp.listen(PORT, '0.0.0.0', () => {
  console.log(`HTTP to HTTPS redirection server running on port ${ PORT }`);
});


process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', err => {
  console.error('Unhandled Rejection:', err);
});