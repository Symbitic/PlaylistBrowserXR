import { Observable } from "@babylonjs/core/Misc/observable";

const SPOTIFY_ACCESS_TOKEN_KEY = "SPOTIFY_ACCESS_TOKEN";
const SPOTIFY_REFRESH_TOKEN_KEY = "SPOTIFY_REFRESH_TOKEN";
const SPOTIFY_EXPIRES_AT_KEY = "SPOTIFY_EXPIRES_AT_KEY";

interface AuthenticationResult {
  access_token: string;
  expires_at: number;
  refresh_token: string;
};

type MessageListener = (evt: MessageEvent) => void;

/**
 * Recognized routes.
 */
export enum Route {
  /** Show the login screen. */
  Login = 'login',
  /** Show the main screen. */
  Home = 'home',
};

/**
 * Handles navigation and authentication.
 */
export default class Router {
  private _token: string = localStorage.getItem(SPOTIFY_ACCESS_TOKEN_KEY) || "";
  private _refreshToken: string = localStorage.getItem(SPOTIFY_REFRESH_TOKEN_KEY) || "";
  private _authWindow: Window | null = null;
  private _listener: MessageListener;
  private _timeout?: NodeJS.Timeout;

  /** Emitted when an error occurred. */
  public onErrorObservable = new Observable<string>();
  /** Emitted when the Spotify access token has changed. */
  public onTokenChangedObservable = new Observable<string>();
  /** Emitted when a redirect is needed. */
  public onRouteChangedObservable = new Observable<Route>();

  /** The current Spotify token. */
  get token() {
    return this._token;
  }

  /** @private The redirect_uri used by Spotify. */
  private get callback() {
    const { origin } = new URL(window.location.href);
    const callback_url = `${origin}/callback.html`;
    return callback_url;
  }

  /**
   * Creates a new Router.
   *
   * Adds a listener for messages, then dispatches a new route based on whether
   * or not a valid access token is available.
   */
  constructor() {
    // Wrapper to enable removing the event listener.
    this._listener = this.onMessageReceived.bind(this);

    this.test(this.token).then((ret: boolean) => {
      if (ret) {
        const expiresStr = localStorage.getItem(SPOTIFY_EXPIRES_AT_KEY) || "";
        const expiresAt = parseInt(expiresStr, 10);
        if (expiresAt !== NaN && this._refreshToken) {
          const ms = expiresAt - Date.now();
          this.startRefreshing(ms, this._refreshToken);
        }

        this.onTokenChangedObservable.notifyObservers(this.token);
        this.onRouteChangedObservable.notifyObservers(Route.Home);
      } else {
        window.addEventListener("message", this._listener);
        this.onRouteChangedObservable.notifyObservers(Route.Login);
      }
    });
  }

  private onMessageReceived(evt: MessageEvent) {
    if (!evt.data || typeof evt.data !== 'string') {
      return;
    }
    const { type, data } = JSON.parse(evt.data);
    if (this._authWindow) {
      this._authWindow.close();
    }

    window.removeEventListener('message', this._listener);
    if (!type || type !== 'success') {
      // TODO: switch(data) {} for a more human-useful error.
      //       might do this in callback.html
      this.onErrorObservable.notifyObservers('Error authorizing Spotify');
    } else {
      this.authenticate(data).then(() => {
        this.onTokenChangedObservable.notifyObservers(this._token);
        this.onRouteChangedObservable.notifyObservers(Route.Home);
      });
    }
  }

  /**
   * @private Invoked when authentication was successful.
   *
   * @param accessToken Token to use with the Spotify API.
   * @param refreshToken Token to use when requesting a new token.
   * @param expiresAt Date at which the current access token will expire.
   */
  private onAuthenticated(accessToken: string, refreshToken: string, expiresAt: number) {
    this._token = accessToken;
    this._refreshToken = refreshToken;

    const ms = expiresAt - Date.now();
    this.startRefreshing(ms, refreshToken);

    localStorage.setItem(SPOTIFY_ACCESS_TOKEN_KEY, this._token);
    localStorage.setItem(SPOTIFY_REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(SPOTIFY_EXPIRES_AT_KEY, String(expiresAt));
  }

  /**
   * @private Authenticate with Spotify.
   *
   * @param data Spotify-issued code.
   * @returns Boolean indicating if authentication was successful.
   */
  private async authenticate(data: string) {
    try {
      this.stopRefreshing();

      const payload = {
        callback_uri: this.callback,
        code: data,
        type: "authorize"
      };
      const response = await fetch('/api/authentication', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        console.error(`Internal Error: ${response.statusText}`);
        return;
      }

      const {
        access_token,
        expires_at,
        refresh_token
      }: AuthenticationResult = await response.json();

      this.onAuthenticated(access_token, refresh_token || access_token, expires_at);
    } catch (err) {
      const errorStr = `Internal error: ${err.message ? err.message : err}`
      console.error(errorStr);
      this.onErrorObservable.notifyObservers(errorStr);
    }
  }

  /**
   * @private Test to see if a token is valid.
   *
   * @param access_token Spotify access token.
   * @returns Boolean indicating if the access token is valid.
   */
  private async test(access_token: string) {
    try {
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          "Authorization": `Bearer ${access_token}`
        }
      });
      return response.ok;
    } catch (err) {
      return false;
    }
  }

  /**
   * Open the login window.
   */
  login() {
    const scopes = [
      'playlist-read-collaborative',
      'playlist-read-private',
      'streaming',
      'user-read-email',
      'user-read-private',
      'user-library-read',
      'user-library-modify',
      'user-read-playback-state',
      'user-modify-playback-state'
    ];

    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);

    const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;

    const obj = {
      'client_id': SPOTIFY_CLIENT_ID,
      'redirect_uri': this.callback,
      'scope': scopes.join('%20'),
      'response_type': 'code',
      'state': randomBytes.join(''),
      'show_dialog': false
    };
    const params = Object.entries(obj)
      .map(([key, value]) => {
        return `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
      })
      .join('&');

    const url = `https://accounts.spotify.com/authorize?${params}`;
    const features = [
      'menubar=no',
      'location=no',
      'resizable=yes',
      'scrollbars=yes',
      'status=no'
    ].join(',');

    this._authWindow = window.open(url, 'Spotify', features);
  }

  private stopRefreshing() {
    if (this._timeout) {
        clearTimeout(this._timeout);
        this._timeout = undefined;
    }
  }

  private startRefreshing(ms: number, refresh_token: string) {
    if (!this._timeout) {
      this._timeout = setTimeout(() => {
        this.refresh(refresh_token);
      }, ms);
    }
  }

  /**
   * Refresh an expired authorization token.
   */
  private async refresh(token: string) {
    try {
      this.stopRefreshing();

      const payload = {
        type: "refresh",
        refresh_token: token
      };
      const response = await fetch('/api/authentication', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        console.error(`Internal Error: ${response.statusText}`);
        return;
      }

      const {
        access_token,
        expires_at,
        refresh_token
      }: AuthenticationResult = await response.json();

      this.onAuthenticated(access_token, refresh_token || access_token, expires_at);
    } catch (err) {
      const errorStr = `Internal error: ${err.message ? err.message : err}`
      console.error(errorStr);
      this.onErrorObservable.notifyObservers(errorStr);
    }
  }
};
