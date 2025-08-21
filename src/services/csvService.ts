import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';
import { CSVRow } from '../types';

export class CSVService {
  /**
   * Read local CSV file
   */
  // async readCSVFile(filePath: string): Promise<CSVRow[]> {
  //   return new Promise((resolve, reject) => {
  //     const results: CSVRow[] = [];
  //     const absolutePath = path.resolve(filePath);

  //     if (!fs.existsSync(absolutePath)) {
  //       reject(new Error(`CSV file not found: ${absolutePath}`));
  //       return;
  //     }

  //     fs.createReadStream(absolutePath)
  //       .pipe(csv())
  //       .on('data', (data: CSVRow) => results.push(data))
  //       .on('end', () => {
  //         console.log(`Successfully read ${results.length} rows from CSV`);
  //         resolve(results);
  //       })
  //       .on('error', (error) => {
  //         console.error('Error reading CSV file:', error);
  //         reject(error);
  //       });
  //   });
  // }

  /**
   * Read CSV from S3 or other sources (extensible)
   */
  // async readCSVFromString(csvContent: string): Promise<CSVRow[]> {
  //   return new Promise((resolve, reject) => {
  //     const results: CSVRow[] = [];
  //     const { Readable } = require('stream');

  //     const stream = Readable.from([csvContent]);

  //     stream
  //       .pipe(csv())
  //       .on('data', (data: CSVRow) => results.push(data))
  //       .on('end', () => {
  //         console.log(`Successfully parsed ${results.length} rows from CSV string`);
  //         resolve(results);
  //       })
  //       .on('error', (error) => {
  //         console.error('Error parsing CSV string:', error);
  //         reject(error);
  //       });
  //   });
  // }

  /**
   * Filter CSV data
   */
  filterRows(data: CSVRow[], filterFn: (row: CSVRow) => boolean): CSVRow[] {
    return data.filter(filterFn);
  }

  /**
   * Search CSV data
   */
  searchRows(data: CSVRow[], column: string, searchTerm: string): CSVRow[] {
    return data.filter((row) => row[column] && row[column].toLowerCase().includes(searchTerm.toLowerCase()));
  }

  /**
   * Get CSV column names
   */
  getColumns(data: CSVRow[]): string[] {
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  }
}
