import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { ApiHandler } from './handler/apiHandler';

// Create API handler instance
const apiHandler = new ApiHandler();

/**
 * AWS Lambda main entry point
 */
export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  console.log('Lambda function invoked', {
    requestId: context.awsRequestId,
    event: {
      httpMethod: event.httpMethod,
      path: event.path,
      headers: event.headers,
    },
  });

  try {
    if (event.httpMethod === 'GET') {
      return await apiHandler.handleGetMethod(event);
    } else if (event.httpMethod === 'POST') {
      return await apiHandler.handleRequest(event);
    } else {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          message: 'Not allow http method',
          requestId: context.awsRequestId,
        }),
      };
    }
  } catch (error) {
    console.error('Unhandled error in lambda handler:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        message: 'Internal server error',
        requestId: context.awsRequestId,
      }),
    };
  }
};

// For local development
if (require.main === module) {
  const express = require('express');
  const app = express();
  const port = process.env.PORT || 8080;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Handle all requests
  app.use(async (req: any, res: any) => {
    const event: APIGatewayProxyEvent = {
      httpMethod: req.method,
      path: req.path,
      headers: req.headers,
      queryStringParameters: req.query && Object.keys(req.query).length > 0 ? req.query : null,
      body: req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : null,
      isBase64Encoded: false,
      pathParameters: null,
      stageVariables: null,
      requestContext: {
        // requestId: `local-${Date.now()}-${Math.random()}`,
        // stage: 'local',
        // httpMethod: req.method,
        // path: req.path,
        // protocol: 'HTTP/1.1',
        // requestTime: new Date().toISOString(),
        // requestTimeEpoch: Date.now(),
        // identity: {
        //   sourceIp: req.ip || '127.0.0.1',
        //   userAgent: req.get('User-Agent') || '',
        // },
        // domainName: req.get('host') || 'localhost',
        // apiId: 'local',
      } as any,
      resource: req.path,
      multiValueHeaders: {},
      multiValueQueryStringParameters: null,
    };

    try {
      const result = await handler(event, {} as Context);

      // Send response
      if (result.body) {
        try {
          // Try to parse as JSON for pretty printing in development
          const jsonBody = JSON.parse(result.body);

          res.json(jsonBody);
        } catch {
          console.log('Not a json, send as text');
          res.send(result.body);
        }
      } else {
        res.end();
      }
    } catch (error) {
      console.error('Local dev error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.listen(port, () => {
    console.log(`🚀 Local development server running on port ${port}`);
    console.log(`📝 Available endpoints:`);
    console.log(`   GET  http://localhost:${port}/hello`);
    console.log(`   POST http://localhost:${port}/csv`);
    console.log(`   POST http://localhost:${port}/email`);
    console.log(`   POST http://localhost:${port}/docs`);
    console.log(`\n💡 Press Ctrl+C to stop the server`);
  });
}
