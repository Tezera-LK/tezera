import * as path from 'node:path';
import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps, Tags } from 'aws-cdk-lib';
import { HttpApi } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

interface ApiStackProps extends StackProps {
  stage: 'dev' | 'main';
  webOrigin: string;
}

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);
    Tags.of(this).add('project', 'tezera');
    Tags.of(this).add('stage', props.stage);

    const fn = new NodejsFunction(this, 'ApiFunction', {
      // Bundles the output of `nest build`, not the .ts source: esbuild can't emit
      // the decorator metadata Nest's dependency injection needs, but tsc already has.
      entry: path.join(__dirname, '../../apps/api/dist/lambda.js'),
      handler: 'handler',
      depsLockFilePath: path.join(__dirname, '../../pnpm-lock.yaml'),
      runtime: Runtime.NODEJS_24_X,
      architecture: Architecture.ARM_64,
      memorySize: 512,
      timeout: Duration.seconds(10),
      environment: {
        WEB_ORIGIN: props.webOrigin,
        NODE_OPTIONS: '--enable-source-maps',
      },
      logGroup: new LogGroup(this, 'ApiLogs', {
        retention: RetentionDays.TWO_WEEKS,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
      bundling: {
        minify: true,
        keepNames: true, // keeps class names readable in Nest's logs and errors
        sourceMap: true,
        target: 'node24',
        // Nest loads these only if installed. We don't use them, so leave them out of the bundle.
        externalModules: [
          '@aws-sdk/*',
          '@nestjs/microservices',
          '@nestjs/microservices/microservices-module',
          '@nestjs/websockets',
          '@nestjs/websockets/socket-module',
          'class-transformer',
          'class-validator',
        ],
      },
    });

    const api = new HttpApi(this, 'HttpApi', {
      apiName: `tezera-api-${props.stage}`,
      defaultIntegration: new HttpLambdaIntegration('ApiIntegration', fn),
      createDefaultStage: false,
    });
    // Throttling caps how many requests (and so how much cost) a runaway client can cause.
    api.addStage('DefaultStage', {
      stageName: '$default',
      autoDeploy: true,
      throttle: { rateLimit: 20, burstLimit: 40 },
    });

    new CfnOutput(this, 'ApiUrl', { value: api.apiEndpoint });
  }
}
