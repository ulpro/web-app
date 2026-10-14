import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'amountInWordsFr',
  standalone: true
})
export class AmountInWordsFrPipe implements PipeTransform {

  private readonly units = ['', 'Un', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Sept', 'Huit', 'Neuf', 'Dix', 'Onze', 'Douze', 'Treize', 'Quatorze', 'Quinze', 'Seize', 'Dix-Sept', 'Dix-Huit', 'Dix-Neuf'];
  private readonly tens = ['', '', 'Vingt', 'Trente', 'Quarante', 'Cinquante', 'Soixante', 'Soixante-Dix', 'Quatre-Vingt', 'Quatre-Vingt-Dix'];

  transform(value: number | string, currency: string = 'FCFA'): string {
    if (value === null || value === undefined || value === '') return '';
    const num = Math.floor(Number(value));
    if (isNaN(num)) return '';
    if (num === 0) return 'Zéro ' + currency;

    const words = this.convertNumberToWords(num);
    return words.trim() + ' ' + currency;
  }

  private convertNumberToWords(num: number): string {
    if (num === 0) return '';
    if (num < 20) return this.units[num] + ' ';
    if (num < 100) {
      const ten = Math.floor(num / 10);
      const unit = num % 10;
      let result = '';

      if (ten === 7 || ten === 9) {
        result = this.tens[ten - 1] + (unit > 0 ? '-' + this.units[10 + unit] + ' ' : ' ');
      } else {
        result = this.tens[ten] + (unit === 1 && ten !== 8 ? ' et Un ' : (unit > 0 ? '-' + this.units[unit] + ' ' : ' '));
      }
      return result;
    }
    if (num < 1000) {
      const hundred = Math.floor(num / 100);
      const rest = num % 100;
      let result = hundred === 1 ? 'Cent ' : this.units[hundred] + ' Cent ';
      if (rest === 0 && hundred > 1) result = result.trim() + 's ';
      return result + this.convertNumberToWords(rest);
    }
    if (num < 1000000) {
      const thousand = Math.floor(num / 1000);
      const rest = num % 1000;
      const result = thousand === 1 ? 'Mille ' : this.convertNumberToWords(thousand).trim() + ' Mille ';
      return result + this.convertNumberToWords(rest);
    }
    if (num < 1000000000) {
      const million = Math.floor(num / 1000000);
      const rest = num % 1000000;
      const result = this.convertNumberToWords(million).trim() + (million > 1 ? ' Millions ' : ' Million ');
      return result + this.convertNumberToWords(rest);
    }
    if (num < 1000000000000) {
      const billion = Math.floor(num / 1000000000);
      const rest = num % 1000000000;
      const result = this.convertNumberToWords(billion).trim() + (billion > 1 ? ' Milliards ' : ' Milliard ');
      return result + this.convertNumberToWords(rest);
    }
    return '';
  }
}
