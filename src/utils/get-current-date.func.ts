type DateFormat = 'dd/mm' | 'dd/mm/yyyy' | 'mm/dd' | 'mm/dd/yyyy';

export function getCurrentDate(format: DateFormat = 'dd/mm/yyyy'): string {
  const now = new Date();

  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();

  switch (format) {
    case 'dd/mm':
      return `${day}/${month}`;

    case 'dd/mm/yyyy':
      return `${day}/${month}/${year}`;

    case 'mm/dd':
      return `${month}/${day}`;

    case 'mm/dd/yyyy':
      return `${month}/${day}/${year}`;

    default:
      throw new Error('Invalid date format');
  }
}
