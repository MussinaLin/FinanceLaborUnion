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
    return await apiHandler.handleRequest(event);
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
  const port = process.env.PORT || 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/payment/:MerchantTradeNo', async (req: any, res: any) => {
    const event: APIGatewayProxyEvent = {
      httpMethod: 'GET',
      path: `/payment/${req.params.MerchantTradeNo}`,
      headers: req.headers,
      queryStringParameters: req.query,
      body: null,
      pathParameters: {
        MerchantTradeNo: req.params.MerchantTradeNo, // 重要：設定 pathParameters
      },
      multiValueHeaders: {},
      multiValueQueryStringParameters: null,
      isBase64Encoded: false,
      stageVariables: null,
      requestContext: {
        requestId: `local-${Date.now()}-${Math.random()}`,
        stage: 'local',
        httpMethod: req.method,
        path: req.path,
        protocol: 'HTTP/1.1',
        requestTime: new Date().toISOString(),
        requestTimeEpoch: Date.now(),
        identity: {
          sourceIp: req.ip || '127.0.0.1',
          userAgent: req.get('User-Agent') || '',
        },
        domainName: req.get('host') || 'localhost',
        apiId: 'local',
      } as any,
      resource: req.path,
    };

    const context: Context = {
      awsRequestId: `local-${Date.now()}`,
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'local-dev',
      functionVersion: '1.0.0',
      invokedFunctionArn: '',
      memoryLimitInMB: '256',
      logGroupName: '',
      logStreamName: '',
      getRemainingTimeInMillis: () => 30000,
      done: () => {},
      fail: () => {},
      succeed: () => {},
    };

    const result = await handler(event, context);

    // Set status code
    // res.status(result.statusCode);

    // Set headers
    // if (result.headers) {
    //   Object.entries(result.headers).forEach(([key, value]) => {
    //     res.set(key, value as string);
    //   });
    // }

    // Send response
    if (result.body) {
      res.send(result.body);
      // try {
      //   // Try to parse as JSON for pretty printing in development
      //   const jsonBody = JSON.parse(result.body);
      //   res.json(jsonBody);
      // } catch {
      //   // If not JSON, send as text

      // }
    } else {
      res.end();
    }
  });

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
        requestId: `local-${Date.now()}-${Math.random()}`,
        stage: 'local',
        httpMethod: req.method,
        path: req.path,
        protocol: 'HTTP/1.1',
        requestTime: new Date().toISOString(),
        requestTimeEpoch: Date.now(),
        identity: {
          sourceIp: req.ip || '127.0.0.1',
          userAgent: req.get('User-Agent') || '',
        },
        domainName: req.get('host') || 'localhost',
        apiId: 'local',
      } as any,
      resource: req.path,
      multiValueHeaders: {},
      multiValueQueryStringParameters: null,
    };

    const context: Context = {
      awsRequestId: `local-${Date.now()}`,
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'local-dev',
      functionVersion: '1.0.0',
      invokedFunctionArn: '',
      memoryLimitInMB: '256',
      logGroupName: '',
      logStreamName: '',
      getRemainingTimeInMillis: () => 30000,
      done: () => {},
      fail: () => {},
      succeed: () => {},
    };

    try {
      const result = await handler(event, context);

      // Set status code
      res.status(result.statusCode);

      // Set headers
      if (result.headers) {
        Object.entries(result.headers).forEach(([key, value]) => {
          res.set(key, value as string);
        });
      }

      // Send response
      if (result.body) {
        res.send(result.body);
        // try {
        //   // Try to parse as JSON for pretty printing in development
        //   const jsonBody = JSON.parse(result.body);
        //   res.json(jsonBody);
        // } catch {
        //   // If not JSON, send as text

        // }
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
