import * as crypto from 'crypto';
import config from '../configs';

// Simple types for ECPay
export type PaymentMethod = 'ALL' | 'Credit' | 'WebATM' | 'ATM' | 'CVS' | 'BARCODE';

export interface CreatePaymentParams {
  merchantTradeNo: string;
  totalAmount: number;
  tradeDesc: string;
  itemName: string;
  returnURL: string;
  clientBackURL?: string;
  choosePayment?: PaymentMethod;
}

export interface PaymentCallback {
  MerchantID: string;
  MerchantTradeNo: string;
  TradeNo: string;
  RtnCode: number;
  RtnMsg: string;
  TradeAmt: string;
  PaymentDate: string;
  PaymentType: string;
  CheckMacValue: string;
}

export class ECPayService {
  private merchantId: string;
  private hashKey: string;
  private hashIV: string;
  private apiUrl: string;

  constructor() {
    this.merchantId = config.ecpay.merchantId;
    this.hashKey = config.ecpay.hashKey;
    this.hashIV = config.ecpay.hashIV;

    // Use test or production API URL based on operation mode
    this.apiUrl =
      config.ecpay.operationMode === 'Production'
        ? 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5'
        : 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5';

    console.log('✅ ECPay service initialized');
    console.log(`   Mode: ${config.ecpay.operationMode}`);
    console.log(`   Merchant ID: ${this.merchantId}`);
    console.log(`   API URL: ${this.apiUrl}`);
  }

  /**
   * Generate CheckMacValue for ECPay API
   */
  private generateCheckMacValue(params: Record<string, any>): string {
    // Remove CheckMacValue if exists
    const { CheckMacValue, ...filteredParams } = params;

    // Sort parameters by key
    const sortedKeys = Object.keys(filteredParams).sort();

    // Create query string
    const queryParts: string[] = [];
    for (const key of sortedKeys) {
      const value = filteredParams[key];
      if (value !== undefined && value !== null && value !== '') {
        queryParts.push(`${key}=${value}`);
      }
    }

    const queryString = queryParts.join('&');

    // Add HashKey and HashIV
    const stringToHash = `HashKey=${this.hashKey}&${queryString}&HashIV=${this.hashIV}`;
    console.log(`checkValue before encode:${stringToHash}`);

    // URL encode
    const encodedString = encodeURIComponent(stringToHash)
      .toLowerCase()
      .replace(/%20/g, '+')
      .replace(/[!'()*]/g, (c) => {
        return '%' + c.charCodeAt(0).toString(16).toUpperCase();
      });

    console.log(`checkValue after encode:${encodedString}`);

    // Generate SHA256 hash and convert to uppercase
    const hash = crypto.createHash('sha256').update(encodedString).digest('hex').toUpperCase();

    return hash;
  }

  /**
   * Generate CheckMacValue for ECPay API
   * @param data - Payment parameters object
   * @param hashKey - ECPay HashKey
   * @param hashIV - ECPay HashIV
   * @returns CheckMacValue string
   */
  private generateCheckMacValueGit = (data: Record<string, any>): string => {
    // Sort object keys alphabetically
    const keys = Object.keys(data).sort();

    let checkValue = '';

    // Build query string from sorted parameters
    for (const key of keys) {
      checkValue += `${key}=${data[key]}&`;
    }

    // Add HashKey and HashIV
    checkValue = `HashKey=${this.hashKey}&${checkValue}HashIV=${this.hashIV}`;

    // URL encode and convert to lowercase
    checkValue = encodeURIComponent(checkValue).toLowerCase();

    // Replace specific encoded characters according to ECPay specification
    checkValue = checkValue
      .replace(/%20/g, '+') // Space
      .replace(/%2d/g, '-') // Hyphen
      .replace(/%5f/g, '_') // Underscore
      .replace(/%2e/g, '.') // Period
      .replace(/%21/g, '!') // Exclamation mark
      .replace(/%2a/g, '*') // Asterisk
      .replace(/%28/g, '(') // Left parenthesis
      .replace(/%29/g, ')') // Right parenthesis
      .replace(/%20/g, '+'); // Space (duplicate, but keeping as in original)

    console.log(`checkValue:${checkValue}`);
    // Generate SHA256 hash
    checkValue = crypto.createHash('sha256').update(checkValue).digest('hex');

    // Convert to uppercase
    checkValue = checkValue.toUpperCase();

    return checkValue;
  };

  /**
   * Generate trade date in ECPay format (YYYY/MM/DD HH:mm:ss)
   */
  private generateTradeDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hour = now.getHours().toString().padStart(2, '0');
    const minute = now.getMinutes().toString().padStart(2, '0');
    const second = now.getSeconds().toString().padStart(2, '0');

    return `${year}/${month}/${day} ${hour}:${minute}:${second}`;
  }

  /**
   * Generate unique merchant trade number
   */
  generateMerchantTradeNo(prefix = 'T'): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    const tradeNo = `${prefix}${timestamp}${random}`;

    // ECPay limitation: max 20 characters
    return tradeNo.substring(0, 20);
  }

  /**
   * Create payment form HTML
   */
  // async createPaymentForm(params: CreatePaymentParams): Promise<{ redirectUrl: string; tradeNo: string }> {
  //   try {
  //     const tradeDate = this.generateTradeDate();

  //     // Build payment parameters
  //     const paymentParams = new URLSearchParams();
  //     paymentParams.append('MerchantID', this.merchantId);
  //     paymentParams.append('MerchantTradeNo', params.merchantTradeNo);
  //     paymentParams.append('MerchantTradeDate', tradeDate);
  //     paymentParams.append('PaymentType', 'aio');
  //     paymentParams.append('TotalAmount', params.totalAmount.toString());
  //     paymentParams.append('TradeDesc', params.tradeDesc);
  //     paymentParams.append('ItemName', params.itemName);
  //     paymentParams.append('ReturnURL', params.returnURL);
  //     paymentParams.append('ChoosePayment', 'ALL');
  //     paymentParams.append('EncryptType', '1');

  //     const paymentParams2: Record<string, any> = {
  //       MerchantID: this.merchantId,
  //       MerchantTradeNo: params.merchantTradeNo,
  //       MerchantTradeDate: tradeDate,
  //       PaymentType: 'aio',
  //       TotalAmount: params.totalAmount,
  //       TradeDesc: params.tradeDesc,
  //       ItemName: params.itemName,
  //       ReturnURL: params.returnURL,
  //       ChoosePayment: 'ALL',
  //       EncryptType: 1,
  //     };

  //     // Generate CheckMacValue

  //     paymentParams.append('CheckMacValue', this.generateCheckMacValueGit(paymentParams2));
  //     paymentParams2.CheckMacValue = this.generateCheckMacValueGit(paymentParams2);

  //     console.log('🏪 Creating ECPay payment form');
  //     console.log(`paymentParams:${JSON.stringify(paymentParams2, null, 2)}`);

  //     // Call ECPay API
  //     const response = await fetch(this.apiUrl, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/x-www-form-urlencoded',
  //       },
  //       body: paymentParams.toString(),
  //     });

  //     console.log(`response.ok:${response.ok}`);
  //     if (!response.ok) {
  //       throw new Error(`ECPay API error: ${response.status} ${response.statusText}`);
  //     }

  //     const result = await response.text();

  //     // console.log('-------------');
  //     // console.log(JSON.stringify(result, null, 2));
  //     // console.log('-------------');

  //     // ECPay returns HTML with redirect, extract the redirect URL
  //     // const redirectUrl = this.extractRedirectUrl(result);

  //     console.log('✅ Payment created successfully');
  //     return {
  //       redirectUrl: result,
  //       tradeNo: params.merchantTradeNo,
  //     };
  //   } catch (error) {
  //     console.error('❌ Error creating payment:', error);
  //     throw new Error(`Failed to create payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
  //   }
  // }

  async createPaymentForm(params: CreatePaymentParams): Promise<{ redirectUrl: string; tradeNo: string }> {
    try {
      const tradeDate = this.generateTradeDate();

      // Build payment parameters
      const paymentParams = new URLSearchParams();
      paymentParams.append('MerchantID', this.merchantId);
      paymentParams.append('MerchantTradeNo', params.merchantTradeNo);
      paymentParams.append('MerchantTradeDate', tradeDate);
      paymentParams.append('PaymentType', 'aio');
      paymentParams.append('TotalAmount', params.totalAmount.toString());
      paymentParams.append('TradeDesc', params.tradeDesc);
      paymentParams.append('ItemName', params.itemName);
      paymentParams.append('ReturnURL', params.returnURL);
      paymentParams.append('ChoosePayment', 'ALL');
      paymentParams.append('EncryptType', '1');

      const paymentParams2: Record<string, any> = {
        MerchantID: this.merchantId,
        MerchantTradeNo: params.merchantTradeNo,
        MerchantTradeDate: tradeDate,
        PaymentType: 'aio',
        TotalAmount: params.totalAmount,
        TradeDesc: params.tradeDesc,
        ItemName: params.itemName,
        ReturnURL: params.returnURL,
        ChoosePayment: 'ALL',
        EncryptType: 1,
      };

      // Generate CheckMacValue
      const checkMacValue = this.generateCheckMacValueGit(paymentParams2);
      paymentParams.append('CheckMacValue', checkMacValue);
      paymentParams2.CheckMacValue = checkMacValue;

      console.log('🏪 Creating ECPay payment form');
      console.log(`paymentParams:${JSON.stringify(paymentParams2, null, 2)}`);

      const html = `
  <html>
  <head></head>
  <body>
  <form id="paymentForm" target="_blank" method="post" action="${this.apiUrl}">
  <input type="text" name="ChoosePayment" value="ALL"><br>
  <input type="text" name="EncryptType" value="1"><br>
  <input type="text" name="ItemName" value=${params.itemName}><br>
  <input type="text" name="MerchantID" value=${this.merchantId}><br>
  <input type="text" name="MerchantTradeDate" value=${tradeDate}><br>
  <input type="text" name="MerchantTradeNo" value=${params.merchantTradeNo}><br>
  <input type="text" name="PaymentType" value="aio"><br>
  <input type="text" name="ReturnURL" value="https://www.ecpay.com.tw/receive.php"><br>
  <input type="text" name="TotalAmount" value=${params.totalAmount}><br>
  <input type="text" name="TradeDesc" value=${params.tradeDesc}><br>
  <input type="text" name="CheckMacValue" value=${checkMacValue}>
  </form>
  <script>
      window.onload = function() {
      document.getElementById('paymentForm').submit();
    };
  </script>
  </body>
  </html>  `;

      console.log('✅ Payment created successfully');
      return {
        redirectUrl: html,
        tradeNo: params.merchantTradeNo,
      };
    } catch (error) {
      console.error('❌ Error creating payment:', error);
      throw new Error(`Failed to create payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract payment URL with parameters from HTML form
   */
  extractPaymentUrl(html: string): string {
    try {
      // Extract form action URL
      const actionMatch = html.match(/action="([^"]+)"/);
      const actionUrl = actionMatch?.[1] || this.apiUrl;

      // Extract all hidden input fields
      const inputMatches = html.matchAll(/<input[^>]+name="([^"]*)"[^>]+value="([^"]*)"/g);
      // const params = new URLSearchParams();
      let params: string = '';

      for (const match of inputMatches) {
        const name = match[1];
        // const value = decodeURIComponent(match[2]); // Decode the value
        // params.append(name, value);
        params = params.concat(match[1] + '/' + match[2]);
      }

      // Combine URL and parameters
      // const paymentUrl = `${actionUrl}?${params.toString()}`;
      const paymentUrl = params.toString();

      console.log('✅ Payment URL extracted successfully');
      return paymentUrl;
    } catch (error) {
      console.error('❌ Error extracting payment URL:', error);
      // Fallback: return API URL (user will need to manually submit form)
      return this.apiUrl;
    }
  }

  /**
   * Extract redirect URL from ECPay response (if needed)
   */
  private extractRedirectUrl(html: string): string {
    // ECPay might return HTML with form or redirect
    const formMatch = html.match(/action="([^"]+)"/);
    // const redirectMatch = html.match(/location\.href\s*=\s*["']([^"']+)["']/);

    // return formMatch?.[1] || redirectMatch?.[1];

    if (formMatch == null) throw new Error("Can't find ECPay redirectUrl...");
    return formMatch[1];
  }

  /**
   * Verify payment callback from ECPay
   */
  verifyCallback(callbackData: PaymentCallback): boolean {
    try {
      console.log('🔒 Verifying ECPay callback');

      const receivedCheckMac = callbackData.CheckMacValue;
      const calculatedCheckMac = this.generateCheckMacValue(callbackData);

      const isValid = receivedCheckMac === calculatedCheckMac;

      if (isValid) {
        console.log('✅ Callback verification successful');
        console.log(`   Trade No: ${callbackData.TradeNo}`);
        console.log(`   Merchant Trade No: ${callbackData.MerchantTradeNo}`);
        console.log(`   Amount: NT$ ${callbackData.TradeAmt}`);
        console.log(`   Status: ${callbackData.RtnCode === 1 ? 'Success' : 'Failed'}`);
      } else {
        console.log('❌ Callback verification failed');
        console.log(`   Received: ${receivedCheckMac}`);
        console.log(`   Calculated: ${calculatedCheckMac}`);
      }

      return isValid;
    } catch (error) {
      console.error('❌ Error verifying callback:', error);
      return false;
    }
  }

  /**
   * Process payment callback result
   */
  processCallback(callbackData: PaymentCallback): {
    isSuccess: boolean;
    isValid: boolean;
    tradeNo: string;
    merchantTradeNo: string;
    amount: number;
    paymentDate: string;
    message: string;
  } {
    const isValid = this.verifyCallback(callbackData);
    const isSuccess = callbackData.RtnCode === 1;

    return {
      isValid,
      isSuccess,
      tradeNo: callbackData.TradeNo,
      merchantTradeNo: callbackData.MerchantTradeNo,
      amount: parseInt(callbackData.TradeAmt),
      paymentDate: callbackData.PaymentDate,
      message: callbackData.RtnMsg,
    };
  }

  /**
   * Query trade information (requires additional API call setup)
   */
  // async queryTradeInfo(merchantTradeNo: string): Promise<any> {
  //   try {
  //     const queryParams = {
  //       MerchantID: this.merchantId,
  //       MerchantTradeNo: merchantTradeNo,
  //       TimeStamp: Math.floor(Date.now() / 1000),
  //     };

  //     queryParams.CheckMacValue = this.generateCheckMacValue(queryParams);

  //     console.log(`🔍 Querying trade info for: ${merchantTradeNo}`);

  //     // Note: This would require implementing HTTP client
  //     // For now, just return the query parameters
  //     console.log('ℹ️  Query parameters prepared:', queryParams);

  //     return {
  //       message: 'Query API not implemented in this simplified version',
  //       queryParams,
  //     };
  //   } catch (error) {
  //     console.error('❌ Error querying trade info:', error);
  //     throw new Error(`Failed to query trade: ${error instanceof Error ? error.message : 'Unknown error'}`);
  //   }
  // }

  /**
   * Get available payment methods
   */
  getPaymentMethods(): PaymentMethod[] {
    return ['ALL', 'Credit', 'WebATM', 'ATM', 'CVS', 'BARCODE'];
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!(this.merchantId && this.hashKey && this.hashIV);
  }

  /**
   * Get service configuration info
   */
  getConfigInfo(): object {
    return {
      operationMode: config.ecpay.operationMode,
      merchantId: this.merchantId || 'Not configured',
      hasHashKey: !!this.hashKey,
      hasHashIV: !!this.hashIV,
      isConfigured: this.isConfigured(),
      apiUrl: this.apiUrl,
    };
  }
}
