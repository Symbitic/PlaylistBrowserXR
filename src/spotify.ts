import SpotifyPlayer, { SpotifyPlaylist } from 'spotify-web-playback';
import { Observable } from "@babylonjs/core/Misc/observable";

export * from 'spotify-web-playback';

export type SpotifyPlaylists = SpotifyPlaylist[];

export default class Spotify {
  public onErrorObservable = new Observable<string>();
  public onConnectedChangedObservable = new Observable<boolean>();
  public onPlaylistsUpdatedObservable = new Observable<SpotifyPlaylists>();

  private _connected = false;
  private _spotify: SpotifyPlayer;

  get connected() {
    return this._connected;
  }

  constructor(name: string) {
    this._spotify = new SpotifyPlayer(name);
  }

  setToken(token: string) {
    this._spotify.setToken(token);
  }

  play(items?: string | string[], offset: number = 0) {
    return this._spotify.play(items, offset);
  }

  pause() {
    return this._spotify.pause();
  }

  async update() {
    const playlists = await this._spotify.getUsersPlaylists();
    this.onPlaylistsUpdatedObservable.notifyObservers(playlists);
  }

  async connect(token: string) {
    try {
      const ret = await this._spotify.connect(token);
      if (ret) {
        this._connected = true;
        this.onConnectedChangedObservable.notifyObservers(true);

        // Do not need to wait.
        this.update();
      } else {
        this.onErrorObservable.notifyObservers('Error connecting to Spotify');
      }
      return ret;
    } catch (err) {
      this.onErrorObservable.notifyObservers(`Internal error: ${err.message}`);
      return false;
    }
  }
};
