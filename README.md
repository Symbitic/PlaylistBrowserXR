# Playlist Browser XR

[![Deploy](https://github.com/Symbitic/PlaylistBrowserXR/actions/workflows/azure-static-web-apps-wonderful-rock-0cfdbe70f.yml/badge.svg)](https://github.com/Symbitic/PlaylistBrowserXR/actions/workflows/azure-static-web-apps-wonderful-rock-0cfdbe70f.yml)
[![GitHub License](https://img.shields.io/github/license/Symbitic/PlaylistBrowserXR?label=License&style=flat-square)](https://github.com/Symbitic/PlaylistBrowserXR/blob/master/LICENSE.md)

Browse Spotify playlists in Virtual Reality.

https://www.playlistbrowserxr.xyz/

## About

Playlist Browser XR is a web player for Spotify playlists that exclusively use
WebXR.

## Technology

Playlist Browser XR is built upon four key technologies:

1. [Azure Static Web Apps](https://azure.microsoft.com/en-us/services/app-service/static/)
2. [Azure Functions](https://azure.microsoft.com/en-us/services/functions/)
3. [Babylon.js](https://www.babylonjs.com/)
4. [Spotify Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk/)

### Azure Static Web Apps

Azure Static Web Apps provides cheap yet scalable hosting for static web
applications. Since we don't require much server-side work, it makes much
more sense to use a static hosting service than running a full-fledged web
server.

There are a few things that need to be done by the server, particularly OAuth.
That requires serverless functions. Azure was chosen over AWS because Azure
Static Web Apps has serverless functions built in. AWS requires a complicated
process to deploy to Amazon Lambda, Cloudfront, API Gateway, and possibly more.

### Azure Functions

OAuth authorization and redirection still needs to be handled by a server, but
since this is neither time-consuming nor computationally expensive, it makes
much more sense to have this run as a serverless function and only invoke it
as needed. Our server handles calls to Spotify's `/api/token` endpoint, and
nothing more.

### Babylon.js

Babylon.js is an 3D game engine for WebGL. It comes with support for WebXR
builtin, including excellent support for the Oculus Quest devices. It has a
builtin 3D GUI specifically for VR mode, and even includes a Holographic Button
widget.

For a complex, stateful application like this, the native support for
TypeScript allows us to catch many errors ahead of time, before deployment.
Also, Babylon.js makes extensive use of Observables. We use Observables in our
own app to avoid having the different modules (Spotify, Router, and App)
coupled to each other.

### Spotify Web Playback SDK

Kudos for Spotify for putting in the effort to make this. The only reason this
web app can exist is because Spotify provides us with a way to play our
favorite tracks and playlists from inside our web applications.

Spotify Web Playback SDK doesn't require any special instructions specifically,
but it does require a valid token, which means setting up a Spotify developer
account.

To handle all the required Spotify API calls, I created my own module,
[spotify-web-playback](https://github.com/Symbitic/spotify-web-playback).

## Requirements

Getting this project up and running requires several things:

1. An [Azure](https://azure.microsoft.com/en-us/) account.
2. A [Spotify](https://developer.spotify.com/) developer account.
3. A paid subscription to [ngrok](https://ngrok.com/).

A Spotify account costs nothing (although the premium account will greatly
enhance the experience). The free account for Azure will be enough for our
needs, but you will need a paid ngrok account for local development.

WebXR *requires* HTTPS. If you plan on testing on a non-local device
(i.e. Oculus Quest), then you will need a valid certificate. Local self-signed
certificates won't work. Ngrok does offer free accounts, but the domain name is
not reserved and may change. Since Spotify requires us to whitelist accepted
redirect URLs before OAuth will work, that means we need a reserved domain name.

## Getting Started

First, you will need to clone this repository. After that, follow these steps:

1. Register a domain name at Ngrok. 
2. Follow the steps [here](https://docs.microsoft.com/en-us/azure/static-web-apps/get-started-cli) to create a new Azure Static Web App. Make sure you take note of the URL for your new web app.
3. Create a Spotify developer application. Take note of the client ID and client secret. Make sure to add `https://MY_NGROK_DOMAIN.ngrok.io/callback.html` and `https://MY_AZURE_URL.azurestaticapps.net/callback.html` to the Redirect URIs.
4. Rename the file `.env.sample` to `.env` and replace the value of `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`.
5. Edit the GitHub workflow file that was created in Step 2 (see note below).
6. Add `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` as repository secrets in GitHub settings.
7. Add `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` as Application Settings in Azure (look in Configuration).
8. Update the badge locations in this file.

Once all that is done, you can build and run it like a standard Node.js web project.

    npm install
    npm run start

In a separate window, make sure you start ngrok:

    ngrok http --hostname MYDOMAIN.ngrok.io --host-header=rewrite 8989

After that, just visit `https://MYDOMAIN.ngrok.io` in your VR headset, and everything should be good.

**NOTE: You may have to open `api/local.settings.json` and set `FUNCTIONS_WORKER_RUNTIME` to `node` for it to work.**

**NOTE: When you run step 2, the first CI build in GitHub actions will fail. That's okay; just copy the content from `.github/workflows/ci.example.yml` and paste it into the `azure-static-web-apps-` workflow file that was created. Make sure you replace `secrets.AZURE_STATIC_WEB_APPS_API_TOKEN_`. You will also need to add `SPOTIFY_CLIENT_ID` as repository secret in GitHub settings.**

## License

Copyright © 2021 Alex Shaw

Licensed under the [MIT](https://spdx.org/licenses/MIT) license. See [LICENSE.md](LICENSE.md) for more details.
