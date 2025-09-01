import * as crypto from 'crypto';
import config from '../configs';

import { CreatePaymentParams, PaymentCallback, PaymentMethod, QueryTradeInfo } from '../types/ecpayTypes';

export class ECPayService {
  private merchantId: string;
  private hashKey: string;
  private hashIV: string;
  private apiUrl: string;
  private queryApiUrl: string;

  constructor() {
    this.merchantId = config.ecpay.merchantId;
    this.hashKey = config.ecpay.hashKey;
    this.hashIV = config.ecpay.hashIV;

    // Use test or production API URL based on operation mode
    this.apiUrl =
      config.ecpay.operationMode === 'Production'
        ? 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5'
        : 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5';

    this.queryApiUrl =
      config.ecpay.operationMode === 'Production'
        ? 'https://payment.ecpay.com.tw/Cashier/QueryTradeInfo/V5'
        : 'https://payment-stage.ecpay.com.tw/Cashier/QueryTradeInfo/V5';

    console.log('✅ ECPay service initialized');
    console.log(`   Mode: ${config.ecpay.operationMode}`);
    console.log(`   Merchant ID: ${this.merchantId}`);
    console.log(`   API URL: ${this.apiUrl}`);
    console.log(`   Query API URL: ${this.queryApiUrl}`);
  }

  /**
   * Generate CheckMacValue for ECPay API
   * @param data - Payment parameters object
   * @param hashKey - ECPay HashKey
   * @param hashIV - ECPay HashIV
   * @returns CheckMacValue string
   */
  private generateCheckMacValue = (data: Record<string, any>): string => {
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
  async createPaymentForm(params: CreatePaymentParams): Promise<{ redirectUrl: string; tradeNo: string }> {
    try {
      const tradeDate = this.generateTradeDate();

      const paymentParams: Record<string, any> = {
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
      const checkMacValue = this.generateCheckMacValue(paymentParams);
      paymentParams.CheckMacValue = checkMacValue;

      console.log('🏪 Creating ECPay payment form');
      console.log(`paymentParams:${JSON.stringify(paymentParams, null, 2)}`);

      const html = `
      <!DOCTYPE html>
<html>
   <head>
      <meta charset="UTF-8">
      <title>重導向到付款頁面...</title>
   </head>
   <body>
      <div style="text-align: center; padding: 20px;">
         <h3>正在重導向到付款頁面...</h3>
         <p>請稍候...</p>
      </div>
      <form id="paymentForm" target="_blank" method="post" action="${this.apiUrl}">
         <input type="hidden" name="ChoosePayment" value="ALL"><br>
         <input type="hidden" name="EncryptType" value="1"><br>
         <input type="hidden" name="ItemName" value="${params.itemName}"><br>
         <input type="hidden" name="MerchantID" value="${this.merchantId}"><br>
         <input type="hidden" name="MerchantTradeDate" value="${tradeDate}"><br>
         <input type="hidden" name="MerchantTradeNo" value="${params.merchantTradeNo}"><br>
         <input type="hidden" name="PaymentType" value="aio"><br>
         <input type="hidden" name="ReturnURL" value="https://www.ecpay.com.tw/receive.php"><br>
         <input type="hidden" name="TotalAmount" value="${params.totalAmount}"><br>
         <input type="hidden" name="TradeDesc" value="${params.tradeDesc}"><br>
         <input type="hidden" name="CheckMacValue" value="${checkMacValue}">
         <div style="text-align: center; margin-top: 20px;">
            <input type="submit" value="如果沒有自動跳轉，請點擊這裡" style="padding: 10px 20px; font-size: 16px;">
         </div>
      </form>
      <script>
         window.onload = function() {
         console.log('Page loaded, submitting form...');
         setTimeout(function() {
           document.getElementById('paymentForm').submit();
         }, 1000);
         };
      </script>
   </body>
</html>
   `;

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
   * Query trade information
   */
  async queryECPay(merchantTradeNo: string): Promise<QueryTradeInfo> {
    const timestamp = Date.now();

    const params: Record<string, string> = {
      MerchantID: this.merchantId,
      MerchantTradeNo: merchantTradeNo,
      TimeStamp: timestamp.toString(),
    };

    const checkMacValue = this.generateCheckMacValue(params);
    params.CheckMacValue = checkMacValue;

    const response = await fetch(this.queryApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params).toString(),
    });

    if (response.status == 200) {
      const responseText = await response.text();
      return this.parseECPayResponse(responseText);
    } else {
      console.error('Response status:', response.status);
      throw new Error(`Response status:${response.status}`);
    }
  }

  parseECPayResponse(responseText: string): QueryTradeInfo {
    const params = new URLSearchParams(responseText);

    return {
      MerchantID: params.get('MerchantID') || '',
      HandlingCharge: params.get('HandlingCharge') || '',
      ItemName: params.get('ItemName') || '',
      MerchantTradeNo: params.get('MerchantTradeNo') || '',
      PaymentDate: params.get('PaymentDate') || '',
      PaymentType: params.get('PaymentType') || '',
      PaymentTypeChargeFee: params.get('PaymentTypeChargeFee') || '',
      StoreID: params.get('StoreID') || '',
      TradeAmt: params.get('TradeAmt') || '',
      TradeDate: params.get('TradeDate') || '',
      TradeNo: params.get('TradeNo') || '',
      TradeStatus: params.get('TradeStatus') || '',
      CustomField1: params.get('CustomField1') || '',
      CustomField2: params.get('CustomField2') || '',
      CustomField3: params.get('CustomField3') || '',
      CustomField4: params.get('CustomField4') || '',
      CheckMacValue: params.get('CheckMacValue') || '',
    };
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
