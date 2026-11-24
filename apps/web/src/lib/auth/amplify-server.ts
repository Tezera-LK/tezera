import "server-only";
import { createServerRunner } from "@aws-amplify/adapter-nextjs";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { cookies } from "next/headers";
import outputs from "../../../amplify_outputs.json";

// Server-side half of the login. The browser keeps the Cognito tokens in cookies (ConfigureAmplify.tsx,
// LoginForm.tsx); this reads them back during a request and CHECKS them.
//
// Reading the cookies is not enough: anyone can write a cookie by hand. The access token is signed by our
// user pool, so verify() confirms the signature, expiry, user pool and app client before we trust it.

const { runWithAmplifyServerContext } = createServerRunner({ config: outputs });

const verifier = CognitoJwtVerifier.create({
  userPoolId: outputs.auth.user_pool_id,
  clientId: outputs.auth.user_pool_client_id,
  tokenUse: "access",
});

export type VerifiedToken = {
  sub: string;
  groups: string[];
};

// The signed-in user from the request's cookies, or null (no tokens, expired, forged, wrong pool).
export async function readVerifiedToken(): Promise<VerifiedToken | null> {
  try {
    const session = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: (contextSpec) => fetchAuthSession(contextSpec),
    });
    const accessToken = session.tokens?.accessToken?.toString();
    if (!accessToken) return null;

    const payload = await verifier.verify(accessToken);
    const groups = payload["cognito:groups"];
    return { sub: payload.sub, groups: Array.isArray(groups) ? groups.map(String) : [] };
  } catch {
    return null;
  }
}
