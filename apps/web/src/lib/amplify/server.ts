// Amplify on the server: lets proxy.ts and Server Components read who is signed in from the request's
// cookies. The browser half is components/ConfigureAmplify.tsx, whose `ssr: true` keeps the login
// tokens in cookies (not localStorage) so they reach the server at all.
//
// No "server-only" import here: src/proxy.ts uses this file, and proxy code can't load that package.
// Nothing secret is in the config anyway; the browser bundle carries the same file.
import { createServerRunner } from "@aws-amplify/adapter-nextjs";
// Written by `pnpm sandbox` (your own backend) or by the Amplify Hosting build; gitignored.
// src/lib/amplify → src/lib → src → apps/web
import outputs from "../../../amplify_outputs.json";

export const { runWithAmplifyServerContext } = createServerRunner({ config: outputs });

// CI writes a placeholder amplify_outputs.json (.github/workflows/ci.yml) so the app builds without AWS.
// No user pool stands behind it, so nobody can sign in with it. Read through a loose type, because a
// half-written file (the sandbox while it deploys) has no "auth" section at all.
const authSection = (outputs as { auth?: { user_pool_client_id?: string } }).auth;
export const hasUserPool = Boolean(authSection?.user_pool_client_id) && authSection?.user_pool_client_id !== "placeholder";
