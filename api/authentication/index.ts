import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import * as dotenv from "dotenv";
import * as path from "path";
import * as querystring from "querystring";
import fetch from "node-fetch";

dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET

interface AuthenticationRequest {
  code: string;
  callback_uri: string;
  refresh_token: string;
  type: "authorize" | "refresh";
}

async function authorize(context: Context, code: string, callback_uri: string) {
  const authToken = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");

  const requestParams: any = {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    headers: {
      "Authorization": `Basic ${authToken}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: querystring.stringify({
      "code": code,
      "redirect_uri": callback_uri,
      "grant_type": "authorization_code"
    })
  };

  const response = await fetch("https://accounts.spotify.com/api/token", requestParams);
  if (response.status !== 200) {
    context.log.error(`Bad response: ${response.statusText}`);
    context.res.json({
      "type": "error",
      "error": "Error while authorizing Spotify"
    });
    return;
  }

  const {
    access_token,
    refresh_token,
    expires_in
  } = await response.json();

  const d = new Date();

  d.setSeconds(d.getSeconds() + (expires_in - 300)); // Refresh 5 minutes before expiration.

  const expiresAt = d.getTime();

  context.res.json({
    "access_token": access_token,
    "refresh_token": refresh_token,
    "expires_at": expiresAt
  });
}

async function refresh(context: Context, token: string) {
  const authToken = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");

  const requestParams: any = {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    headers: {
      "Authorization": `Basic ${authToken}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: querystring.stringify({
      "refresh_token": token,
      "grant_type": "refresh_token"
    })
  };

  const response = await fetch("https://accounts.spotify.com/api/token", requestParams);
  if (response.status !== 200) {
    context.log.error(`Bad response (refresh_token): ${response.statusText}`);
    context.res.json({
      "type": "error",
      "error": "Error while refreshing Spotify"
    });
    return null;
  }

  const {
    access_token,
    refresh_token,
    expires_in
  } = await response.json();

  const d = new Date();

  d.setSeconds(d.getSeconds() + (expires_in - 300)); // Refresh 5 minutes before expiration.

  const expiresAt = d.getTime();

  context.res.json({
    "access_token": access_token,
    "refresh_token": refresh_token ? refresh_token : token,
    "expires_at": expiresAt
  });
}

function unrecognized(context: Context, type: string) {
  context.log.error(`Unrecognized type: ${type}`);
  context.res = {
    status: 200, // TODO: should this really be 200? It is programmer error.
    body: {
      error: `Unrecognized type: ${type}`
    }
  }
}

const httpTrigger: AzureFunction = async function (context: Context, _req: HttpRequest): Promise<void> {
  const body: AuthenticationRequest = context.req.body;

  switch (body.type) {
    case "authorize":
      return authorize(context, body.code, body.callback_uri);
    case "refresh":
      return refresh(context, body.refresh_token);
    default:
      return unrecognized(context, body.type);
  }
}

export default httpTrigger;
