const express = require( 'express' );
const http = require( 'http' );
const https = require( 'https' );
const fs = require( 'fs' );
const WebSocket = require( 'ws' );
const os = require( 'os' );
const qrcode = require('qrcode-terminal');
const wsHandler = require( './wsHandler' );
const { debug } = require( './utils' );
const app = express();

// HTTPS certificates
const privateKey = fs.readFileSync( 'certs/private.key', 'utf8' );
const certificate = fs.readFileSync( 'certs/server.crt', 'utf8' );
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
app.use( express.static( 'public' ) );

// HTTP to HTTPS redirect
const redirectApp = express();
redirectApp.use( ( req, res ) => {
  res.redirect( 'https://' + req.headers.host.replace( /:\d+$/, ':3000' ) + req.url );
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

const localIP = getLocalIP();

// Start servers
httpsServer.listen( 3000, '0.0.0.0', () => {
  const URL = `https://${ localIP }:3000`;
  console.log( `### BABY-CALL APP ###` );
  console.log( `\n\n` );
  console.log( `You can open the webApp from here: ${ URL }` );
  console.log( `Or you can scan this QR code with your phone:` );
  qrcode.generate( URL, { small: true } );
} );

http.createServer( redirectApp ).listen( 80, '0.0.0.0', () => {
  // nothing to do
} );