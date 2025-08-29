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

export interface QueryTradeInfo {
  MerchantID: string;
  HandlingCharge: string;
  ItemName: string;
  MerchantTradeNo: string;
  PaymentDate: string;
  PaymentType: string;
  PaymentTypeChargeFee: string;
  StoreID: string;
  TradeAmt: string;
  TradeDate: string;
  TradeNo: string;
  TradeStatus: string;
  CustomField1: string;
  CustomField2: string;
  CustomField3: string;
  CustomField4: string;
  CheckMacValue: string;
}
