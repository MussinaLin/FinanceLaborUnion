// import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet } from 'google-spreadsheet';
import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

interface MemberData {
  member_id: string;
  member_email: string;
}

export interface PaymentRecord {
  member_id: string;
  member_email: string;
  payment_link: string | undefined;
  payment_link_sent: string | undefined;
  unique_payment_link: string | undefined;
  paid: string | undefined;
  paid_date: string | undefined;
}

export class GoogleSheetsService {
  private doc: GoogleSpreadsheet;
  private serviceAccountAuth: JWT;

  constructor(spreadsheetId: string, serviceAccountKey: any) {
    this.serviceAccountAuth = new JWT({
      email: serviceAccountKey.clientEmail,
      key: serviceAccountKey.privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.doc = new GoogleSpreadsheet(spreadsheetId, this.serviceAccountAuth);
    this.doc.loadInfo();
  }

  /**
   * Generate payment links for all members and update monthly sheet
   */
  async generatePaymentLinks(): Promise<void> {
    try {
      // await this.doc.loadInfo();
      console.log('Connected to Google Sheets:', this.doc.title);

      // Get current year-month format (YYYYMM)
      const now = new Date();
      const yyyymm = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;

      // Read members from All_members sheet
      const members = await this.getAllMembers();
      console.log(`Found ${members.length} members`);

      // Get or create monthly sheet
      const monthlySheet = await this.getOrCreateMonthlySheet(yyyymm);

      // Generate payment links and update monthly sheet
      for (const member of members) {
        const paymentLink = `${member.member_id}_${yyyymm}`;

        await this.addPaymentRecord(monthlySheet, {
          member_id: member.member_id,
          member_email: member.member_email,
          payment_link: paymentLink,
          payment_link_sent: 'N',
          unique_payment_link: '', // Leave blank
          paid: '', // Leave blank
          paid_date: '', // Leave blank
        } as PaymentRecord);

        console.log(`Generated payment link for ${member.member_id}: ${paymentLink}`);
      }

      console.log('✅ Payment links generation completed');
    } catch (error) {
      console.error('❌ Error generating payment links:', error);
      throw error;
    }
  }

  async updatePaymentData(sheetName: string, memberId: string, data: PaymentRecord): Promise<void> {
    console.log(`[updatePaymentData] sheetName:${sheetName} memberId:${memberId}`);

    const sheet = this.doc.sheetsByTitle[sheetName];
    if (!sheet) {
      throw new Error(`sheet:${sheetName} not found`);
    }

    const rows = await sheet.getRows();
    const targetRow = rows.filter((r) => r.get('member_id') === memberId)[0];
    if (data.payment_link != undefined) targetRow.set('payment_link', data.payment_link);
    if (data.payment_link_sent != undefined) targetRow.set('payment_link_sent', data.payment_link_sent);
    if (data.unique_payment_link != undefined) targetRow.set('unique_payment_link', data.unique_payment_link);
    if (data.paid != undefined) targetRow.set('paid', data.paid);
    if (data.paid_date != undefined) targetRow.set('paid_date', data.paid_date);
    await targetRow.save();
  }

  async updatePaymentDataBatch(sheetName: string, memberIds: string[], datas: PaymentRecord[]): Promise<void> {
    console.log(`[updatePaymentDataBatch] sheetName:${sheetName}`);
    const idLength = memberIds.length;
    const dataLength = datas.length;
    if (idLength != dataLength) throw new Error('idLength != dataLength');

    const sheet = this.doc.sheetsByTitle[sheetName];
    if (!sheet) {
      throw new Error(`sheet:${sheetName} not found`);
    }

    const rows = await sheet.getRows();
    for (let i = 0; i < memberIds.length; i++) {
      const memberId = memberIds[i];
      const targetRow = rows.filter((r) => r.get('member_id') === memberId)[0];
      const data = datas[i];
      if (data.payment_link != undefined) targetRow.set('payment_link', data.payment_link);
      if (data.payment_link_sent != undefined) targetRow.set('payment_link_sent', data.payment_link_sent);
      if (data.unique_payment_link != undefined) targetRow.set('unique_payment_link', data.unique_payment_link);
      if (data.paid != undefined) targetRow.set('paid', data.paid);
      if (data.paid_date != undefined) targetRow.set('paid_date', data.paid_date);
      await targetRow.save();
    }
  }

  /**
   * Read all members from yyyymm sheet
   */
  public async getAllPaymentDatas(sheetName: string): Promise<PaymentRecord[]> {
    const sheet = this.doc.sheetsByTitle[sheetName];
    if (!sheet) {
      throw new Error(`sheet:${sheetName} not found`);
    }

    const rows = await sheet.getRows();
    return rows
      .map(
        (row) =>
          ({
            member_id: row.get('member_id') || '',
            member_email: row.get('member_email') || '',
            payment_link: row.get('payment_link') || '',
            payment_link_sent: row.get('payment_link_sent') || '',
            unique_payment_link: row.get('unique_payment_link') || '',
            paid: row.get('paid') || '',
            paid_date: row.get('paid_date') || '',
          }) as PaymentRecord,
      )
      .filter((member) => member.member_id && member.member_email);
  }

  /**
   * Read all members from All_members sheet
   */
  private async getAllMembers(): Promise<MemberData[]> {
    const sheet = this.doc.sheetsByTitle['All_members'];
    if (!sheet) {
      throw new Error('All_members sheet not found');
    }

    const rows = await sheet.getRows();
    return rows
      .map((row) => ({
        member_id: row.get('member_id') || '',
        member_email: row.get('member_email') || '',
      }))
      .filter((member) => member.member_id && member.member_email);
  }

  /**
   * Get or create monthly sheet (e.g., "202508")
   */
  private async getOrCreateMonthlySheet(yyyymm: string): Promise<GoogleSpreadsheetWorksheet> {
    let sheet = this.doc.sheetsByTitle[yyyymm];

    if (!sheet) {
      // Create new sheet with headers
      sheet = await this.doc.addSheet({
        title: yyyymm,
        headerValues: [
          'member_id',
          'member_email',
          'payment_link',
          'payment_link_sent',
          'unique_payment_link',
          'paid',
          'paid_date',
        ],
      });
      console.log(`Created new sheet: ${yyyymm}`);
    }

    return sheet;
  }

  /**
   * Add payment record to monthly sheet
   */
  private async addPaymentRecord(sheet: GoogleSpreadsheetWorksheet, record: PaymentRecord): Promise<void> {
    await sheet.addRow({
      member_id: record.member_id,
      member_email: record.member_email,
      payment_link: record.payment_link!,
      payment_link_sent: record.payment_link_sent!,
      unique_payment_link: record.unique_payment_link!,
      paid: record.paid!,
      paid_date: record.paid_date!,
    });
  }

  /**
   * Update existing payment record (optional - for future use)
   */
  async updatePaymentStatus(yyyymm: string, memberId: string, isPaid: boolean): Promise<void> {
    const sheet = this.doc.sheetsByTitle[yyyymm];
    if (!sheet) {
      throw new Error(`Sheet ${yyyymm} not found`);
    }

    const rows = await sheet.getRows();
    const targetRow = rows.find((row) => row.get('member_id') === memberId);

    if (targetRow) {
      targetRow.set('paid', isPaid ? 'YES' : 'NO');
      if (isPaid) {
        targetRow.set('paid_date', new Date().toISOString().split('T')[0]);
      }
      await targetRow.save();
      console.log(`Updated payment status for ${memberId}: ${isPaid ? 'PAID' : 'UNPAID'}`);
    }
  }
}
