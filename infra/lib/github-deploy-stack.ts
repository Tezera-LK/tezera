import { CfnOutput, Duration, Stack, StackProps, Tags } from 'aws-cdk-lib';
import { OidcProviderNative, PolicyStatement, Role, WebIdentityPrincipal } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface GithubDeployStackProps extends StackProps {
  /**
   * The start of the OIDC token's `sub` claim for the repository. The repo uses GitHub's
   * immutable subject format, `repo:<owner>@<owner id>/<repo>@<repo id>`, so renaming the
   * repo or owner doesn't hand the role to a new repo with the old name.
   * Check it with: gh api repos/Tezera-LK/tezera/actions/oidc/customization/sub
   */
  subjectPrefix: string;
  /** Only workflows running on these branches can use the role. */
  branches: string[];
}

/**
 * Lets GitHub Actions deploy with CDK through OpenID Connect (OIDC), so no AWS access keys
 * are stored in GitHub. GitHub signs a short-lived token for each workflow run, and AWS
 * swaps it for temporary credentials for the role below.
 */
export class GithubDeployStack extends Stack {
  constructor(scope: Construct, id: string, props: GithubDeployStackProps) {
    super(scope, id, props);
    Tags.of(this).add('project', 'tezera');

    // An account can hold only one provider for this URL. If one already exists,
    // this deploy fails: import the existing one with OidcProviderNative.fromOidcProviderArn instead.
    const provider = new OidcProviderNative(this, 'GithubOidcProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
    });

    const role = new Role(this, 'GithubDeployRole', {
      roleName: 'tezera-github-deploy',
      description: `GitHub Actions deploys from ${props.subjectPrefix} (${props.branches.join(', ')})`,
      maxSessionDuration: Duration.hours(1),
      assumedBy: new WebIdentityPrincipal(provider.oidcProviderArn, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          // Any one of these values matches: a push to one of the listed branches.
          'token.actions.githubusercontent.com:sub': props.branches.map(
            (branch) => `${props.subjectPrefix}:ref:refs/heads/${branch}`,
          ),
        },
      }),
    });

    // The role can only hand over to the roles `cdk bootstrap` created in this account and
    // Region. Those roles do the actual work: upload the Lambda bundle and run CloudFormation.
    role.addToPolicy(
      new PolicyStatement({
        actions: ['sts:AssumeRole'],
        resources: [`arn:aws:iam::${this.account}:role/cdk-*-${this.account}-${this.region}`],
      }),
    );

    new CfnOutput(this, 'DeployRoleArn', { value: role.roleArn });
  }
}
