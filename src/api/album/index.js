const AlbumHandler = require('./handler');
const routes = require('./routes');

module.exports = {
  name: 'album',
  version: '1.0.0',
  register: async (server, { service, validator, storageService }) => {
    const albumHandler = new AlbumHandler(service, validator, storageService);
    server.route(routes(albumHandler));
  },
};
