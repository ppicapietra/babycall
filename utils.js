function debug( message, type = 'debug' ) {
	const debugEnabled = process.env.DEBUG === 'true';
	if ( !debugEnabled ) return;
	switch ( type ) {
		case 'info':
		case 'debug':
			console.log( message );
			break;
		case 'error':
			console.error( message );
			break;
		case 'warn':
			console.warn( message );
			break;
	}
}

module.exports = {
  debug
};