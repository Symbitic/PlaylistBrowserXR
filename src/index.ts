import { Engine } from '@babylonjs/core/Engines/engine';

import Spotify, { SpotifyPlaylists } from './spotify';
import Router, { Route } from './router';
import App, { Command } from './app';

function createEngine(canvas: HTMLCanvasElement) {
  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true
  });

  engine.setHardwareScalingLevel(1 / window.devicePixelRatio);
  engine.enableOfflineSupport = false;

  window.addEventListener('resize', () => {
    engine.resize();
  });

  engine.resize();

  return engine;
}

window.addEventListener('DOMContentLoaded', async () => {
  const spotify = new Spotify('playlist-browser-xr');

  if (!Engine.isSupported()) {
    const div = <HTMLDivElement>document.getElementById('errorMessage');
    div.innerHTML = 'Your browser does not support WebGL';
    div.className = '';
    return;
  }

  const canvas = <HTMLCanvasElement>document.getElementById('root');
  const engine = createEngine(canvas);

  const router = new Router();
  const app = new App(engine, canvas);

  try {
    await app.createScene();
  } catch (err) {
    console.error(`Error: ${err.message}`);
    const div = <HTMLDivElement>document.getElementById('errorMessage');
    div.innerHTML = `An error occurred while preparing the game.<br />${err.message}`;
    div.className = '';
    return;
  }

  const required = process.env.REQUIRE_WEBXR && process.env.REQUIRE_WEBXR === 'true';
  if (required && !app.supported) {
    const msg = 'WebXR is not supported';
    console.error(msg);
    app.showError(msg);
    return app.run();
  }

  router.onTokenChangedObservable.add(async (token: string) => {
    const connected = spotify.connected;
    if (connected) {
      spotify.setToken(token);
    } else {
      const ret = await spotify.connect(token);
      if (!ret) {
        console.error(`Error connecting to Spotify`);
        app.setStatus("Error connecting to Spotify");
      }
    }
  });

  router.onRouteChangedObservable.add((route: Route) => {
    switch (route) {
      case Route.Login:
        app.showLoginScreen();
        break;
      case Route.Home:
        app.showHomeScreen();
        break;
    }
  });

  app.onLoginClickedObservable.add(() => {
    router.login();
  });

  app.onNewCommandObservable.add((command: Command) => {
    switch (command.name) {
      case "play":
        spotify.play(command.data);
        break;
      case "pause":
        spotify.pause();
        break;
    }
  });

  spotify.onPlaylistsUpdatedObservable.add((playlists: SpotifyPlaylists) => {
    app.setPlaylists(playlists);
  });

  spotify.onErrorObservable.add((err: string) => {
    app.showError(err);
  });

  router.onErrorObservable.add((err: string) => {
    app.showError(err);
  });

  app.run();
});
