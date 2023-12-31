const autoBind = require('auto-bind');

class AlbumHandler {
  constructor(service, validator, storageService) {
    this._service = service;
    this._validator = validator;
    this._storageService = storageService;

    autoBind(this);
  }

  async postAlbumHandler(request, h) {
    this._validator.validateAlbumPayload(request.payload);
    const { name, year } = request.payload;
    const albumId = await this._service.addAlbum({ name, year });
    const response = h.response({
      status: 'success',
      message: 'Album telah ditambahkan',
      data: {
        albumId,
      },
    });
    response.code(201);
    return response;
  }

  async getAlbumByIdHandler(request) {
    const { id } = request.params;
    const album = await this._service.getAlbumById(id);
    return {
      status: 'success',
      data: {
        album,
      },
    };
  }

  async putAlbumByIdHandler(request) {
    this._validator.validateAlbumPayload(request.payload);
    const { id } = request.params;
    await this._service.editAlbumById(id, request.payload);
    return {
      status: 'success',
      message: 'Album telah diperbarui',
    };
  }

  async deleteAlbumByIdHandler(request) {
    const { id } = request.params;
    await this._service.deleteAlbumById(id);
    return {
      status: 'success',
      message: 'Album telah dihapus',
    };
  }

  async postUploadCoverImageHandler(request, h) {
    const { cover } = request.payload;
    const { id: albumId } = request.params;

    this._validator.validateAlbumCoverHeaders(cover.hapi.headers);

    const filename = await this._storageService.writeFile(cover, cover.hapi);
    const fileLocation = `http://${process.env.HOST}:${process.env.PORT}/albums/${filename}`;

    await this._service.addAlbumCover(albumId, fileLocation);

    const response = h.response({
      status: 'success',
      message: 'Sampul berhasil diunggah',
    });
    response.code(201);
    return response;
  }

  async postLikesByAlbumIdHandler(request, h) {
    const { id: albumId } = request.params;
    const { id: credentialId } = request.auth.credentials;
    let message = '';

    await this._service.getAlbumById(albumId);

    const isAlbumAlreadyLiked = await this._service.isAlbumAlreadyLiked(albumId, credentialId);

    if (isAlbumAlreadyLiked) {
      await this._service.removeLikesByAlbumId(albumId, credentialId);
      message = 'Album berhasil di unlike';
    } else {
      await this._service.addLikesByAlbumId(albumId, credentialId);
      message = 'Album berhasil di like';
    }
    const response = h.response({
      status: 'success',
      message,
    });
    response.code(201);
    return response;
  }

  async getLikesByAlbumIdHandler(request, h) {
    const { id: albumId } = request.params;

    await this._service.getAlbumById(albumId);

    const { likes, source } = await this._service.countLikesByAlbumId(albumId);

    const response = h.response({
      status: 'success',
      data: {
        likes,
      },
    });

    if (source === 'cache') {
      response.header('X-Data-Source', 'cache');
    }
    return response;
  }

  async deleteLikesByAlbumIdHandler(request) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._service.removeLikesByAlbumId(id, credentialId);
    return {
      status: 'success',
      message: 'Album berhasil di unlike',
    };
  }
}

module.exports = AlbumHandler;
