// Import the actual module with any type to bypass TypeScript checking
const ECPayPayment = require('ecpay_aio_nodejs');

// Define types for ECPay
export type PaymentMethod =
  | 'ALL'
  | 'Credit'
  | 'WebATM'
  | 'ATM'
  | 'CVS'
  | 'BARCODE'
  | 'AndroidPay'
  | 'ApplePay'
  | 'LinePay'
  | 'JKOPay'
  | 'EasyWallet'
  | 'TaiwanPay';

export interface PaymentParams {
  MerchantID: string;
  MerchantTradeNo: string;
  MerchantTradeDate: string;
  PaymentType: 'aio';
  TotalAmount: number;
  TradeDesc: string;
  ItemName: string;
  ReturnURL: string;
  ChoosePayment: PaymentMethod;
  ClientBackURL?: string;
  ItemURL?: string;
  Remark?: string;
  ChooseSubPayment?: string;
  OrderResultURL?: string;
  NeedExtraPaidInfo?: 'Y' | 'N';
  DeviceSource?: string;
  IgnorePayment?: string;
  PlatformID?: string;
  InvoiceMark?: 'Y' | 'N';
  CustomField1?: string;
  CustomField2?: string;
  CustomField3?: string;
  CustomField4?: string;
  EncryptType?: 1;
}

export interface QueryPaymentParams {
  MerchantID: string;
  MerchantTradeNo: string;
  TimeStamp: number;
}

export interface TradeInfo {
  MerchantID: string;
  MerchantTradeNo: string;
  TradeNo: string;
  TradeAmt: number;
  PaymentDate: string;
  PaymentType: string;
  PaymentTypeChargeFee: number;
  TradeDate: string;
  CheckMacValue: string;
}

export interface PaymentResult {
  CheckMacValue: string;
  MerchantID: string;
  MerchantTradeNo: string;
  PaymentDate: string;
  PaymentType: string;
  PaymentTypeChargeFee: string;
  RtnCode: number;
  RtnMsg: string;
  SimulatePaid: string;
  TradeAmt: string;
  TradeDate: string;
  TradeNo: string;
  CustomField1?: string;
  CustomField2?: string;
  CustomField3?: string;
  CustomField4?: string;
}

export interface ECPayOptions {
  OperationMode: 'Test' | 'Production';
  MercProfile: {
    MerchantID: string;
    HashKey: string;
    HashIV: string;
  };
  IgnorePayment?: PaymentMethod[];
  IsProjectContractor?: boolean;
}

import config from '../configs';

export class ECPayService {
  private ecpay: any;
  private options: ECPayOptions;

  constructor() {
    this.options = {
      OperationMode: config.ecpay.operationMode,
      MercProfile: {
        MerchantID: config.ecpay.merchantId,
        HashKey: config.ecpay.hashKey,
        HashIV: config.ecpay.hashIV,
      },
      IgnorePayment: [],
      IsProjectContractor: false,
    };

    try {
      this.ecpay = new ECPayPayment(this.options);
      console.log('✅ ECPay service initialized successfully');
      console.log(`   Mode: ${this.options.OperationMode}`);
      console.log(`   Merchant ID: ${this.options.MercProfile.MerchantID}`);
    } catch (error) {
      console.error('❌ Failed to initialize ECPay service:', error);
      throw error;
    }
  }

  /**
   * Create payment form HTML
   */
  createPayment(params: {
    merchantTradeNo: string;
    totalAmount: number;
    tradeDesc: string;
    itemName: string;
    returnURL: string;
    clientBackURL?: string;
    choosePayment?: PaymentMethod;
    customFields?: {
      field1?: string;
      field2?: string;
      field3?: string;
      field4?: string;
    };
  }): string {
    try {
      const tradeDate = this.generateTradeDate();

      const paymentParams: PaymentParams = {
        MerchantID: this.options.MercProfile.MerchantID,
        MerchantTradeNo: params.merchantTradeNo,
        MerchantTradeDate: tradeDate,
        PaymentType: 'aio',
        TotalAmount: params.totalAmount,
        TradeDesc: params.tradeDesc,
        ItemName: params.itemName,
        ReturnURL: params.returnURL,
        ChoosePayment: params.choosePayment || 'ALL',
        // ClientBackURL: params.clientBackURL,
        EncryptType: 1,
        // CustomField1: params.customFields?.field1,
        // CustomField2: params.customFields?.field2,
        // CustomField3: params.customFields?.field3,
        // CustomField4: params.customFields?.field4,
      };

      console.log('🏪 Creating ECPay payment form');
      // console.log(`   Trade No: ${params.merchantTradeNo}`);
      // console.log(`   Amount: NT$ ${params.totalAmount}`);
      // console.log(`   Payment Method: ${params.choosePayment || 'ALL'}`);

      console.log(`paymentParams:${paymentParams}`);

      const paymentForm = this.ecpay.payment_client.aio_check_out_all(paymentParams);

      console.log('✅ Payment form created successfully');
      return paymentForm;
    } catch (error) {
      console.error('❌ Error creating payment form:', error);
      throw new Error(`Failed to create payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Query trade information
   */
  async queryTradeInfo(merchantTradeNo: string): Promise<TradeInfo> {
    try {
      const queryParams: QueryPaymentParams = {
        MerchantID: this.options.MercProfile.MerchantID,
        MerchantTradeNo: merchantTradeNo,
        TimeStamp: Math.floor(Date.now() / 1000),
      };

      console.log(`🔍 Querying trade info for: ${merchantTradeNo}`);

      const result = await this.ecpay.query_client.trade_info(queryParams);

      console.log('✅ Trade info retrieved successfully');
      return result;
    } catch (error) {
      console.error('❌ Error querying trade info:', error);
      throw new Error(`Failed to query trade: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify payment callback
   */
  verifyPaymentCallback(receivedData: Record<string, any>, receivedCheckMacValue: string): boolean {
    try {
      console.log('🔒 Verifying payment callback');

      const isValid = ECPayPayment.verification(
        receivedCheckMacValue,
        receivedData,
        this.options.MercProfile.HashKey,
        this.options.MercProfile.HashIV,
      );

      if (isValid) {
        console.log('✅ Payment callback verification successful');
      } else {
        console.log('❌ Payment callback verification failed');
      }

      return isValid;
    } catch (error) {
      console.error('❌ Error verifying payment callback:', error);
      return false;
    }
  }

  /**
   * Process payment result
   */
  processPaymentResult(callbackData: PaymentResult): {
    isSuccess: boolean;
    tradeNo: string;
    merchantTradeNo: string;
    amount: number;
    paymentDate: string;
    message: string;
  } {
    const isSuccess = callbackData.RtnCode === 1;

    const result = {
      isSuccess,
      tradeNo: callbackData.TradeNo,
      merchantTradeNo: callbackData.MerchantTradeNo,
      amount: parseInt(callbackData.TradeAmt),
      paymentDate: callbackData.PaymentDate,
      message: callbackData.RtnMsg,
    };

    if (isSuccess) {
      console.log('✅ Payment completed successfully');
      console.log(`   Trade No: ${result.tradeNo}`);
      console.log(`   Amount: NT$ ${result.amount}`);
    } else {
      console.log('❌ Payment failed or cancelled');
      console.log(`   Message: ${result.message}`);
    }

    return result;
  }

  /**
   * Generate unique merchant trade number
   */
  generateMerchantTradeNo(prefix?: string): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    const tradeNo = `${prefix || 'T'}${timestamp}${random}`;

    // ECPay限制：交易編號最長20碼
    return tradeNo.substring(0, 20);
  }

  /**
   * Generate trade date in ECPay format
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
   * Get available payment methods
   */
  getPaymentMethods(): PaymentMethod[] {
    return [
      'ALL',
      'Credit',
      'WebATM',
      'ATM',
      'CVS',
      'BARCODE',
      'AndroidPay',
      'ApplePay',
      'LinePay',
      'JKOPay',
      'EasyWallet',
      'TaiwanPay',
    ];
  }

  /**
   * Check if service is properly configured
   */
  isConfigured(): boolean {
    return !!(
      this.options.MercProfile.MerchantID &&
      this.options.MercProfile.HashKey &&
      this.options.MercProfile.HashIV
    );
  }

  /**
   * Get service configuration info
   */
  getConfigInfo(): object {
    return {
      operationMode: this.options.OperationMode,
      merchantId: this.options.MercProfile.MerchantID || 'Not configured',
      hasHashKey: !!this.options.MercProfile.HashKey,
      hasHashIV: !!this.options.MercProfile.HashIV,
      isConfigured: this.isConfigured(),
    };
  }
}
