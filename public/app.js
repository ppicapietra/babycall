function uiModel() {
  return {
    // State
    screenOn: true,
    isConnected: false,
    isLoading: false,
    ROLES: {
      TRANSMITTER: 'transmitter',
      SUBSCRIBER: 'subscriber',
    },
    role: null,
    isTransmitting: false,
    isSubscribed: false,
    statusMessage: 'Disconnected',

    // Youtube
    isYoutubePlaying: false,
    youtubeUrl: '',
    showYoutubeControls: true,

    pendingIceCandidates: new Map(),

    // WebSocket and PeerConnection
    ws: null,
    localStream: null,
    peerConnections: new Map(),
    iceCandidatesQueue: [],
    reconnectAttempts: 0,
    MAX_RECONNECT_ATTEMPTS: 5,

    // Methods
    async startTransmission() {
      this.isLoading = true;
      this.statusMessage = 'Starting transmission...';
      this.role = this.ROLES.TRANSMITTER;

      try {
        // Verificar si ya existe una transmisión activa
        if ( this.isTransmitting ) {
          throw new Error( 'Ya existe una transmisión activa' );
        }

        // Solicitar el stream con manejo de errores específico
      try {

        const cameraPerm = await navigator.permissions.query( { name: 'camera' } );
        if ( cameraPerm.state === 'denied' ) {
          throw new Error( 'Se requiere acceso a la cámara.' );
        }

        const micPerm = await navigator.permissions.query( { name: 'microphone' } );
        if ( micPerm.state === 'denied' ) {
          throw new Error( 'Se requiere acceso al micrófono.' );
        }

        this.localStream = await navigator.mediaDevices.getUserMedia( {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        } );

      } catch ( error ) {
        if ( error.name === 'NotAllowedError' ) {
          throw new Error( 'Se requiere acceso a la cámara y micrófono. Por favor, permite el acceso en la configuración del navegador.' );
        } else if ( error.name === 'NotFoundError' ) {
          throw new Error( 'No se encontró una cámara o micrófono disponible.' );
        } else if ( error.name === 'NotReadableError' ) {
          throw new Error( 'La cámara o micrófono está siendo usado por otra aplicación.' );
        } else {
          throw new Error( 'Error al acceder a la cámara o micrófono: ' + error.message );
        }
      }

        const localVideo = document.querySelector( '#videoStreamPlayer' );
        // Create a new MediaStream with only video track for local preview
        const videoOnlyStream = new MediaStream(
          this.localStream.getVideoTracks()
        );
        localVideo.srcObject = videoOnlyStream;
        localVideo.muted = true;

        this.sendMessage( { type: 'register', role: this.role } );
        this.isTransmitting = true;
        this.statusMessage = 'Transmitting...';

      } catch ( error ) {
        this.statusMessage = 'Error: ' + error.message;
        console.error( 'Error starting transmission:', error );
      } finally {
        this.isLoading = false;
      }
    },

    async startSubscription() {
      this.isLoading = true;
      this.statusMessage = 'Starting subscription...';
      this.role = this.ROLES.SUBSCRIBER;

      try {

        this.sendMessage( { type: 'register', role: this.role } );
        this.statusMessage = 'Waiting for transmission...';
      } catch ( error ) {
        this.statusMessage = 'Error: ' + error.message;
        console.error( 'Error starting subscription:', error );
      }
    },

    createPeerConnection( target ) {
      console.log( 'Creating new peer connection' );
      const pc = new RTCPeerConnection();

      pc.onicecandidate = event => {
        if ( event.candidate ) {
          console.log( 'New ICE candidate generated' );
          if ( this.ws && this.ws.readyState === WebSocket.OPEN ) {
            this.sendMessage( { type: 'ice_candidate', candidate: event.candidate, target: target } );
            console.log( 'ICE candidate sent to server' );
          }
          else {
            console.log( 'WebSocket not ready. Cancelling ICE candidate' );
          }
        }
      };

      // only for subscribers
      pc.ontrack = event => {
        console.log( 'Received remote track' );
        const remoteVideo = document.querySelector( '#videoStreamPlayer' );
        if ( remoteVideo ) {
          remoteVideo.srcObject = event.streams[ 0 ];
          remoteVideo.muted = false;
          console.log( 'Remote video source set' );
        }
      };

      pc.onconnectionstatechange = () => {
        console.log( 'Peer connection state changed:', pc.connectionState );
        switch ( pc.connectionState ) {
          case 'connected':
            this.statusMessage = 'Connection established';
            console.log( 'Peer connection established' );
            if ( this.role === this.ROLES.SUBSCRIBER ) {
              this.isSubscribed = true;
              this.statusMessage = 'Subscribed to transmission';
              this.isLoading = false;
            }
            break;
          case 'disconnected':
          case 'failed':
            console.log( 'Peer connection disconnected or failed' );
            this.cleanupPeerConnection( target );
            if ( ( this.role === this.ROLES.SUBSCRIBER ) || ( this.peerConnections.size === 0 && this.ws?.readyState === WebSocket.CLOSED ) ) {
              this.handleDisconnect();
            }
            break;
          default:
            break;
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log( 'ICE connection state changed:', pc.iceConnectionState );
        if ( pc.iceConnectionState === 'failed' ) {
          console.log( 'ICE connection failed, attempting to reconnect' );
        }
      };

      pc.onsignalingstatechange = () => {
        console.log( 'Signaling state changed:', pc.signalingState );
      };

      return pc;
    },

    init() {
      this.initializeWebSocket();
      window.addEventListener( 'beforeunload', function () {
        this.sendMessage( { type: 'close' } );
      } );
      if ( !navigator.onLine ) {
        console.info( 'No internet connection' );
        this.showYoutubeControls = false;
      }
    },

    async initializeWebSocket() {
      // Cerrar cualquier conexión WebSocket existente
      if ( this.ws ) return;

      const wsUrl = `wss://${ window.location.hostname }:${ window.location.port || 3000 }`;
      console.log( 'Connecting to WebSocket:', wsUrl );

      this.ws = new WebSocket( wsUrl );

      return new Promise( ( resolve, reject ) => {
        const timeout = setTimeout( () => {
          reject( new Error( 'WebSocket connection timeout' ) );
        }, 10000 );

        this.ws.addEventListener( 'open', () => {
          clearTimeout( timeout );
          resolve();
        } );

        this.ws.addEventListener( 'error', ( error ) => {
          clearTimeout( timeout );
          console.error( 'WebSocket error:', error );
          reject( error );
        } );

        // Guardar una referencia al this actual
        const self = this;

        /**
         * MESSAGE TYPES:
         * Transmitter:
         * create-offer
         * error
         * answer
         * ice-candidate
         * 
         * Subscriber:
         * transmission_ended
         * offer
         * error
         * 
         */
        this.ws.addEventListener( 'message', ( event ) => {
          console.log( 'Message received:', event );
          const data = JSON.parse( event.data );

          switch ( self.role ) {
            case self.ROLES.TRANSMITTER:
              self.handleSubscriptorMessage( data );
              break;
            case self.ROLES.SUBSCRIBER:
              self.handleTransmitterMessage( data );
              break;
          }
        } );

        this.ws.addEventListener( 'close', () => {
          self.handleWebSocketClose();
        } );
      } );
    },

    async sendMessage( data ) {
      if ( this.ws && this.ws.readyState === WebSocket.OPEN ) {
        console.log( `sending message [${ data.type }]`, data );
        this.ws.send( JSON.stringify( data ) );
      }
    },

    //#region Transmitter handlers
    async handleSubscriptorMessage( data ) {
      let { type, ...payload } = data;
      if ( type === 'error' ) {
        this.statusMessage = `Error: ${ payload.message }`;
        console.error( 'Error received:', payload.message );
      } else if ( type === 'transmission_ended' ) {
        console.log( 'Transmission ended by server' );
        this.statusMessage = 'Transmission ended';
        this.cleanupPeerConnection( payload.sender );
      } else if ( data.type === 'create-offer' ) {
        console.log( 'Received create-offer' );
        this.handleCreateOffer( payload );
      } else if ( type === 'answer' ) {
        console.log( 'Received answer' );
        this.handleAnswer( payload );
      } else if ( type === 'ice-candidate' ) {
        console.log( 'Received ICE candidate' );
        this.handleIceCandidate( payload );
      } else if ( type === 'command' ) {
        if ( this.isTransmitting ) {
          this.handleCommand( payload );
        }
      } else if ( type === 'disconnect' ) {
        this.handleRemoteDisconnection( payload );
      }
    },

    async handleCreateOffer( payload ) {
      console.log( 'Received create-offer' );
      let peerConnection = this.createPeerConnection( payload.sender );

      this.localStream.getTracks().forEach( track => peerConnection.addTrack( track, this.localStream ) );

      let offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription( offer );

      this.peerConnections.set( payload.sender, peerConnection );
      this.sendMessage( { type: 'offer', offer, desc: peerConnection.localDescription, target: payload.sender } );
    },

    async handleAnswer( payload ) {
      try {
        let peerConnection = this.peerConnections.get( payload.sender );
        await peerConnection.setRemoteDescription( payload.answer );
        // Procesar candidatos almacenados (si existen)
        const pendingCandidates = this.pendingIceCandidates?.get( payload.sender ) || [];
        for ( const candidate of pendingCandidates ) {
          await peerConnection.addIceCandidate( candidate );
        }
        this.pendingIceCandidates?.delete( payload.sender );
        console.log( 'Remote description set successfully' );
      } catch ( error ) {
        console.error( 'Error setting remote description:', error );
      }
    },

    async handleCommand( payload ) {
      console.log( 'Received command:', payload );
      const command = payload.command;
      if ( command.element === 'youtube' ) {
        this.handleYoutubeCommand( command );
      }
      this.sendMessage( { type: 'command-result', command } );
    },

    async handleYoutubeCommand( command ) {
      if ( command.action === 'play' ) {
        if ( this.isYoutubePlaying ) return;
        const urlPattern = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        const match = command.data.url.match( urlPattern );
        const videoId = match ? match[ 1 ] : command.data.url;
        this.youtubeUrl = videoId;
        this.playYoutubeVideo();
      } else if ( command.action === 'stop' ) {
        this.stopYoutubeVideo();
      }
    },

    playYoutubeVideo() {
      const el = document.querySelector( '#youtubePlayer' );
      el.setAttribute( 'videoid', this.youtubeUrl );
      el.setAttribute( 'playlabel', 'Play' );
      el.setAttribute( 'params', 'autoplay=1&controls=0&modestbranding=1&playsinline=1&rel=0&enablejsapi=1' );
      el.style.display = 'none';

      // Actualizar el videoid del componente
      el.videoId = this.youtubeUrl;

      // Forzar la actualización del componente
      if ( el.addIframe ) {
        el.addIframe();
      }

      // Esperar a que el iframe esté disponible
      let attempts = 0;
      const maxAttempts = 10;

      const checkIframe = setInterval( () => {
        attempts++;

        const iframe = el.shadowRoot?.querySelector( 'iframe' );
        if ( iframe ) {
          clearInterval( checkIframe );

          // Asegurarse de que el iframe esté configurado correctamente
          iframe.style.display = 'none';
          iframe.setAttribute( 'allow', 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture' );
          iframe.setAttribute( 'allowfullscreen', '' );

          // Intentar reproducir el video
          try {
            iframe.contentWindow.postMessage( '{"event":"command","func":"playVideo","args":""}', '*' );
          } catch ( error ) {
            console.error( 'Error sending play command to iframe:', error );
          }
        } else if ( attempts >= maxAttempts ) {
          console.error( 'Iframe not found after maximum attempts' );
          clearInterval( checkIframe );
        }
      }, 500 );

      // Timeout para evitar bucle infinito
      setTimeout( () => {
        clearInterval( checkIframe );
      }, 10000 );

      this.isYoutubePlaying = true;
    },

    stopYoutubeVideo() {
      const youtubePlayer = document.querySelector( '#youtubePlayer' );
      const iframe = youtubePlayer.shadowRoot?.querySelector( 'iframe' );
      if ( iframe ) {
        try {
          iframe.remove();
          console.log( 'Stopping YouTube video...' );
          this.isYoutubePlaying = false;
          this.youtubeUrl = '';
        } catch ( error ) {
          console.error( 'Error stopping YouTube video:', error );
        }
      } else {
        console.error( 'No YouTube player found' );
      }
    },

    //#endregion

    //#region Subscriber handlers
    async handleTransmitterMessage( data ) {
      let { type, ...payload } = data;
      if ( type === 'error' ) {
        this.statusMessage = `Error: ${ payload.message }`;
        console.error( 'Error received:', payload.message );
      } else if ( type === 'transmission_ended' ) {
        console.log( 'Transmission ended by server' );
        this.statusMessage = 'Transmission ended';
        this.cleanupPeerConnection( payload.sender );
      } else if ( type === 'offer' ) {
        console.log( 'Received offer' );
        this.handleOffer( payload );
      } else if ( type === 'command-result' ) {
        console.log( 'Received command result' );
        this.handleCommandResult( payload );
      } else if ( type === 'ice_candidate' ) {
        console.log( 'Received ICE candidate' );
        this.handleIceCandidate( payload );
      } else if ( type === 'disconnect' ) {
        this.handleRemoteDisconnection( payload );
      }
    },

    async handleOffer( payload ) {
      try {
        if ( this.role !== this.ROLES.SUBSCRIBER || this.isSubscribed ) {
          console.log( 'Rejecting new offer: Client is already subscribed to a transmission or is not a subscriber' );
          return;
        }

        // Crear nueva conexión peer para esta oferta
        console.log( 'Creating new peer connection for subscriber' );
        let peerConnection = this.createPeerConnection( payload.sender );

        peerConnection.addTransceiver('video', { direction: 'recvonly' });
        peerConnection.addTransceiver('audio', { direction: 'recvonly' });

        console.log( 'Setting remote description' );
        await peerConnection.setRemoteDescription( new RTCSessionDescription( payload.offer ) );

        console.log( 'Creating answer' );
        const answer = await peerConnection.createAnswer();
        console.log( 'Setting local description' );
        await peerConnection.setLocalDescription( answer );
        // Procesar candidatos almacenados (si existen)
        const pendingCandidates = this.pendingIceCandidates?.get( payload.sender ) || [];
        for ( const candidate of pendingCandidates ) {
          await peerConnection.addIceCandidate( candidate );
        }
        this.pendingIceCandidates?.delete( payload.sender );

        if ( this.ws && this.ws.readyState === WebSocket.OPEN ) {
          console.log( 'Sending answer to server' );
          this.sendMessage( { type: 'answer', answer, target: payload.sender } );
          this.peerConnections.set( payload.sender, peerConnection );
        } else {
          console.error( 'WebSocket not connected to send answer' );
        }
      } catch ( error ) {
        console.error( 'Error handling offer:', error );
        this.statusMessage = 'Error processing offer';
        this.cleanupPeerConnection( payload.sender );
      }
    },

    async sendCommand( command ) {
      console.log( 'sending command', command )
      let target = this.peerConnections.keys().next().value; // get first peer connection due to only one peer connection is supported for subscribers
      let message = { type: 'command', command, target }
      this.ws.send( JSON.stringify( message ) );
    },

    async sendPlayYoutubeCommand() {
      if ( this.youtubeUrl.trim() ) {
        const command = {
          element: 'youtube',
          action: 'play',
          data: { url: this.youtubeUrl.trim() }
        };
        this.sendCommand( command );
      }
    },

    async sendStopYoutubeCommand() {
      const command = {
        element: 'youtube',
        action: 'stop'
      };
      this.sendCommand( command );
    },

    async handleCommandResult( payload ) {
      console.log( 'Received command result:', payload );
      if ( payload.command?.element === 'youtube' ) {
        this.handleYoutubeCommandResult( payload.command );
      }
    },

    async handleYoutubeCommandResult( command ) {
      console.log( 'Received youtube command result:', command );
      if ( command.action === 'play' ) {
        this.isYoutubePlaying = true;
        this.youtubeUrl = command.data.url;
      } else if ( command.action === 'stop' ) {
        this.isYoutubePlaying = false;
        this.youtubeUrl = '';
      }
    },
    //#endregion

    //#region Common handlers
    async handleIceCandidate( payload ) {
      console.log( `ice-candidate received from ${ payload.sender }` )

      try {
        let peerConnection = this.peerConnections.get( payload.sender );
        if ( peerConnection?.remoteDescription?.type ) {
          peerConnection.addIceCandidate( payload.candidate ).catch( console.error );
        } else {
          if ( !this.pendingIceCandidates ) this.pendingIceCandidates = new Map();
          if ( !this.pendingIceCandidates.has( payload.sender ) ) {
            this.pendingIceCandidates.set( payload.sender, [] );
          }
          let iceCandidate = new RTCIceCandidate( payload.candidate );
          this.pendingIceCandidates.get( payload.sender ).push( iceCandidate );
        }
        console.log( 'Pending ICE candidate added successfully' );
      } catch ( error ) {
        console.error( 'Error saving pending ICE candidate:', error );
      }
    },

    handleWebSocketClose() {
      console.log( 'WebSocket connection closed' );
      this.ws.close();
      if ( this.peerConnections.size === 0 ) {
        this.handleDisconnect();
        this.ws = null;
      }
    },

    handleDisconnect() {
      console.log( 'Handling disconnect' );
      this.statusMessage = 'Disconnected';
      if ( this.isYoutubePlaying ) {
        this.stopYoutubeVideo();
      }
      this.isSubscribed = false;
      this.isTransmitting = false;
      this.screenOn = true;
      this.peerConnections.forEach( ( peerConnection, peerConnectionId ) => {
        this.cleanupPeerConnection( peerConnectionId );
      } );
      if ( this.role === this.ROLES.TRANSMITTER ) {
        this.localStream.getTracks().forEach( track => track.stop() );
      }
      if ( this.ws?.readyState === WebSocket.OPEN ) {
        this.sendMessage( { type: 'disconnect' } );
      }
      else {
        this.ws = null;
      }
    },

    handleRemoteDisconnection( payload ) {
      console.log( 'Received remote disconnection' );
      this.cleanupPeerConnection( payload.sender );
      if ( this.role === this.ROLES.SUBSCRIBER && this.peerConnections.size === 0 ) {
        this.handleDisconnect();
      }
    },

    hangup() {
      console.log( 'User initiated hangup' );
      this.handleDisconnect();
    },

    cleanupPeerConnection( peerConnectionId ) {
      let peerConnection = this.peerConnections.get( peerConnectionId );
      if ( peerConnection ) {
        peerConnection.close();
        this.peerConnections.delete( peerConnectionId );
      }
    },
    //#endregion
  };
}
