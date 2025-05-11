const ClientsHandler = require( './clientHandler' );
const { debug } = require( './utils' );

function onConnection( ws, req ) {
  try {
    try {
      const { randomUUID } = require('node:crypto');
      ws.id = randomUUID();
    } catch (error) {
      debug("Crypto not available, using random UUID");
      ws.id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
    ws.role = null;
    ws.address = req.socket.remoteAddress;
  
    debug( `New client connected [ID: ${ ws.id }] from ${ ws.address }` );
  
  
    ws.on( 'message', ( message ) => {
      onMessage.call( { ws }, message );
    } );
  
    ws.on( 'close', () => {
      onClose.call( { ws } );
    } );
  
    ws.on( 'error', ( error ) => {
      onError.call( { ws }, error );
    } );
  } catch (error) {
    console.error( `Error on connection: ${ error }` );
  }
}

function onMessage( message ) {
  try {
    const ws = this.ws;
    const data = JSON.parse( message );
    debug( `Received message: ${ JSON.stringify( data?.type ) }` );

    /**
     * MESSAGE TYPES:
     * register
     * disconnect
     * offer
     * answer
     * ice-candidate
     * command
     */

    let { type, ...payload } = data;
    switch ( type ) {
      case 'register':
        ClientsHandler.handleRegister( ws, payload );
        break;
      case 'disconnect':
        ClientsHandler.handleDisconnect( ws );
        break;
      case 'offer':
        ClientsHandler.handleOffer( ws, payload ); // just send offer to target subscriber
        break;
      case 'answer':
        ClientsHandler.handleAnswer( ws, payload ); // just send answer to target transmitter
        break;
      case 'ice_candidate':
        ClientsHandler.handleIceCandidate( ws, payload ); // just send ice candidate to target subscriber
        break;
      case 'command':
        ClientsHandler.handleCommand( ws, payload ); // just send forward command to associated transmitter
        break;
      case 'command-result':
        ClientsHandler.handleCommandResult( ws, payload ); // just send command result to all subscribers
        break;
    }


  } catch ( error ) {
    debug( `Error handling message: ${ error }` );
  }
}

function onClose() {
  const ws = this.ws;
  debug( `Client disconnected [ID: ${ ws.id }]` );
  ClientsHandler.handleClose( ws );
}

function onError( error ) {
  const ws = this.ws;
  debug( `Error in connection [ID: ${ ws.id }]:`, error );
}

module.exports = {
  onConnection,
  onMessage,
  onClose,
  onError
};

