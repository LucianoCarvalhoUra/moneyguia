import { addDays, isSaturday, isSunday, setDate, startOfMonth, getDaysInMonth } from 'date-fns';

/**
 * Ajusta uma data se ela cair em final de semana
 */
export function adjustToBusinessDay(date: Date, strategy: 'next' | 'previous' | 'exact' = 'next'): Date {
  if (strategy === 'exact') return date;

  if (isSaturday(date)) {
    return strategy === 'next' ? addDays(date, 2) : addDays(date, -1);
  }
  if (isSunday(date)) {
    return strategy === 'next' ? addDays(date, 1) : addDays(date, -2);
  }

  return date;
}

/**
 * Obtém a data exata do N-ésimo dia útil de um determinado mês/ano
 */
export function getNthBusinessDay(year: number, monthIndex: number, nthDay: number, strategy: 'next' | 'previous' = 'next'): Date {
  let currentDate = startOfMonth(new Date(year, monthIndex, 1));
  let businessDaysCount = 0;
  const totalDays = getDaysInMonth(currentDate);

  for (let day = 1; day <= totalDays; day++) {
    currentDate = new Date(year, monthIndex, day);

    // Se não for sábado nem domingo (se tiver lista de feriados, adicione aqui)
    if (!isSaturday(currentDate) && !isSunday(currentDate)) {
      businessDaysCount++;
      if (businessDaysCount === nthDay) {
        return currentDate;
      }
    }
  }

  // Caso o mês tenha menos dias úteis que o solicitado, retorna o último dia útil
  return adjustToBusinessDay(currentDate, strategy);
}
