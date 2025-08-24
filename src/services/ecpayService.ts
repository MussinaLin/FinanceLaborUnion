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
  createPaymentForm(params: CreatePaymentParams): string {
    try {
      const tradeDate = this.generateTradeDate();

      // Build payment parameters
      const paymentParams: Record<string, any> = {
        MerchantID: this.merchantId,
        MerchantTradeNo: params.merchantTradeNo,
        MerchantTradeDate: tradeDate,
        PaymentType: 'aio',
        TotalAmount: params.totalAmount,
        TradeDesc: params.tradeDesc,
        ItemName: params.itemName,
        ReturnURL: params.returnURL,
        ChoosePayment: params.choosePayment || 'ALL',
        EncryptType: 1,
      };

      // Add optional parameters
      if (params.clientBackURL) {
        paymentParams.ClientBackURL = params.clientBackURL;
      }

      // Generate CheckMacValue
      paymentParams.CheckMacValue = this.generateCheckMacValue(paymentParams);

      console.log('🏪 Creating ECPay payment form');
      console.log(`   Trade No: ${params.merchantTradeNo}`);
      console.log(`   Amount: NT$ ${params.totalAmount}`);
      console.log(`   Payment Method: ${params.choosePayment || 'ALL'}`);
      console.log(`paymentParams:${JSON.stringify(paymentParams, null, 2)}`);

      // Generate HTML form
      const formFields = Object.entries(paymentParams)
        .map(([key, value]) => `<input type="hidden" name="${key}" value="${value}">`)
        .join('\n');

      const html = `
        <form id="ecpayForm" method="post" action="${this.apiUrl}">
          ${formFields}
        </form>
        <script>
          document.getElementById('ecpayForm').submit();
        </script>
      `;

      console.log('✅ Payment form created successfully');
      return html;
    } catch (error) {
      console.error('❌ Error creating payment form:', error);
      throw new Error(`Failed to create payment form: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
