import ROLES from './consts.mjs';
import logger from './logger.mjs';

// Clientes
const Clients = new Set(); // ws

// Observadores
const Subscriptors = new Set(); // ws

function handleRegister( ws, data ) {
  logger.info( `Client from ${ ws.address } registered as ${ data.role }` );
  ws.role = data.role;
  Clients.add( ws );
  if ( data.role === ROLES.TRANSMITTER ) {
    // we notify the transmitter about every subscriber already connected
    for ( const clientWs of Clients ) {
      if ( clientWs.role === ROLES.SUBSCRIBER ) {
        logger.debug( `found previous subscriber at ${ clientWs.address }` );
        logger.debug( `sending create-offer to transmitter at ${ ws.address }` );
        sendMessage( ws, { type: 'create-offer', sender: clientWs.id } );
      }
    }
  } else if ( data.role === ROLES.SUBSCRIBER ) {
    for ( const clientWs of Clients ) {
      if ( clientWs.role === ROLES.TRANSMITTER ) {
        logger.debug( `found previous transmitter at ${ clientWs.address }` );
        sendMessage( clientWs, { type: 'create-offer', sender: ws.id } );
        break;
      }
    }
  }
}

function removeClient( ws ) {
  ws.close();
  Clients.delete( ws );
}

function handleOffer( ws, data ) {
  const { target, offer } = data;
  for ( const clientWs of Clients ) {
    if ( clientWs.id === target ) {
      sendMessage( clientWs, { type: 'offer', offer, sender: ws.id } );
      break;
    }
  }
}

function handleAnswer( ws, data ) {
  const { target, answer } = data;
  for ( const clientWs of Clients ) {
    if ( clientWs.id === target ) {
      logger.debug( `Transmitter found at ${ clientWs.address }` );
      sendMessage( clientWs, { type: 'answer', answer, sender: ws.id } );
      break;
    }
  }
}

function handleIceCandidate( ws, data ) {
  const { target, candidate } = data;
  for ( const clientWs of Clients ) {
    if ( clientWs.id === target ) {
      sendMessage( clientWs, { type: 'ice-candidate', candidate, sender: ws.id } );
      break;
    }
  }
}

function handleDisconnect( ws ) {
  if ( Clients.has( ws ) ) {
    logger.info( `${ ws.role } at ${ ws.address } disconnected` );
    ws.role = null;
    // notifiy any other client about this client disconnection
    for ( const clientWs of Clients ) {
      if ( clientWs !== ws ) {
        sendMessage( clientWs, { type: 'disconnect', sender: ws.id } );
      }
    }
  }
}

function handleClose( ws ) {
  removeClient( ws );
  ws.close();
}

function handleCommand( ws, data ) {
  const { target, command } = data;
  let transmitterWs = null;
  for ( const clientWs of Clients ) {
    if ( clientWs.role === ROLES.TRANSMITTER && clientWs.id === target ) {
      transmitterWs = clientWs;
      break;
    }
  }
  if ( transmitterWs ) {
    sendMessage( transmitterWs, { type: 'command', command, sender: ws.id } );
  }
}

function handleCommandResult( ws, data ) {
  const { target, command } = data;
  for ( const clientWs of Clients ) {
    if ( clientWs.role === ROLES.SUBSCRIBER && clientWs.id !== target ) {
      sendMessage( clientWs, { type: 'command-result', command, sender: ws.id } );
      break;
    }
  }
}

function sendMessage( ws, message ) {
  ws.send( JSON.stringify( message ) );
}

const ClientsHandler = {
  handleRegister,
  handleOffer,
  handleAnswer,
  handleIceCandidate,
  handleDisconnect,
  handleCommand,
  handleCommandResult,
  handleClose
};

export default ClientsHandler;
