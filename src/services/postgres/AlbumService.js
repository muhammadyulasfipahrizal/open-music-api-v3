const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const ClientError = require('../../exceptions/ClientError');

class AlbumService {
  constructor(cacheService) {
    this._pool = new Pool();
    this._cacheService = cacheService;
  }

  async addAlbum({ name, year }) {
    const id = `album-${nanoid(16)}`;

    const query = {
      text: 'INSERT INTO album VALUES($1, $2, $3) RETURNING id',
      values: [id, name, year],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Album gagal ditambahkan');
    }

    return result.rows[0].id;
  }

  async addAlbumCover(albumId, fileLocation) {
    const query = {
      text: 'UPDATE album SET "coverUrl" = $1 WHERE id = $2 RETURNING id',
      values: [fileLocation, albumId],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Sampul album gagal ditambahkan');
    }

    return result.rows[0].id;
  }

  async getAlbumById(id) {
    const query = {
      text: 'SELECT * FROM album WHERE id = $1',
      values: [id],
    };
    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Album tidak ditemukan');
    }

    const album = result.rows[0];
    const query2 = {
      text: 'SELECT * FROM songs WHERE "albumId" = $1',
      values: [album.id],
    };

    const result2 = await this._pool.query(query2);

    if (!result2.rows.length) {
      album.songs = [];
      return album;
    }

    album.songs = result2.rows.map((song) => ({
      id: song.id, title: song.title, performer: song.performer,
    }));
    return album;
  }

  async editAlbumById(id, { name, year }) {
    const query = {
      text: 'UPDATE album SET name = $1, year = $2 WHERE id = $3 RETURNING id',
      values: [name, year, id],
    };

    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError('Album gagal diperbarui. Id tidak ditemukan');
    }
  }

  async deleteAlbumById(id) {
    const query = {
      text: 'DELETE FROM album WHERE id = $1 RETURNING id',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Album gagal dihapus. Id tidak ditemukan');
    }
  }

  async isAlbumAlreadyLiked(albumId, userId) {
    const query = {
      text: 'SELECT * FROM user_album_likes WHERE user_id = $1 AND album_id = $2',
      values: [userId, albumId],
    };

    const { rows } = await this._pool.query(query);
    if (rows.length > 0) {
      throw new ClientError('Album gagal dihapus. Id tidak ditemukan');
    }
    return (rows.length > 0);
  }

  async addLikesByAlbumId(albumId, userId) {
    const id = nanoid(16);

    const query = {
      text: 'INSERT INTO user_album_likes VALUES($1, $2, $3) RETURNING id',
      values: [id, userId, albumId],
    };

    const { rows } = await this._pool.query(query);
    await this._cacheService.delete(`likes:${albumId}`);
    return rows[0].id;
  }

  async removeLikesByAlbumId(albumId, userId) {
    const query = {
      text: 'DELETE FROM user_album_likes WHERE user_id = $1 AND album_id = $2 RETURNING id',
      values: [userId, albumId],
    };

    const { rows } = await this._pool.query(query);
    await this._cacheService.delete(`likes:${albumId}`);
    return rows[0].id;
  }

  async countLikesByAlbumId(albumId) {
    try {
      const result = await this._cacheService.get(`likes:${albumId}`);
      return { likes: parseInt(result, 10), source: 'cache' };
    } catch (error) {
      const query = {
        text: 'SELECT COUNT(id) AS jumlah FROM user_album_likes WHERE album_id = $1',
        values: [albumId],
      };
      const { rows } = await this._pool.query(query);
      await this._cacheService.set(`likes:${albumId}`, rows[0].jumlah);
      return { likes: parseInt(rows[0].jumlah, 10), source: 'db' };
    }
  }
}

module.exports = AlbumService;
