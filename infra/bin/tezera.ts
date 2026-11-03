import { App } from 'aws-cdk-lib';
import { ApiStack } from '../lib/api-stack';
import { GithubDeployStack } from '../lib/github-deploy-stack';

const app = new App();

// The account comes from the AWS credentials used to deploy. The Region is fixed to Mumbai.
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'ap-south-1' };

if (app.node.tryGetContext('github') === 'true') {
  // One-time setup, run by hand: `pnpm run deploy:github`.
  // Lets GitHub Actions deploy the API stacks without stored AWS keys.
  new GithubDeployStack(app, 'TezeraGithubDeploy', {
    repo: 'Tezera-LK/Tezera',
    branches: ['dev', 'main'],
    env,
  });
} else {
  // One API stack per Amplify branch: `-c stage=dev` or `-c stage=main`.
  const stage = app.node.tryGetContext('stage') ?? 'dev';

  // The site each stage serves, for CORS. The browser normally reaches the API through
  // the site's own /api path (a Next.js rewrite), so CORS only matters for direct calls.
  const webOrigins: Record<string, string> = {
    dev: 'https://dev.tezera.lk',
    main: 'https://tezera.lk',
  };
  if (!(stage in webOrigins)) {
    throw new Error(`Unknown stage "${stage}". Use -c stage=dev or -c stage=main.`);
  }

  new ApiStack(app, `TezeraApi-${stage}`, {
    stage: stage as 'dev' | 'main',
    webOrigin: webOrigins[stage],
    env,
  });
}
