import { useState, useMemo, ReactNode } from 'react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Download, FileSpreadsheet, FileType, Calendar, Filter, ChevronDown, Wallet, Bot, PieChart as PieChartIcon, Loader2, Sparkles, ScanLine } from 'lucide-react';
import { AIReportGenerator } from '@/components/reports/AIReportGenerator';
import { ReceiptUploader } from '@/components/receipts/ReceiptUploader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useFinance } from '@/contexts/FinanceContext';
import { useIncome } from '@/contexts/IncomeContext';
import { useAuth } from '@/contexts/AuthContext';
import { PAYMENT_METHOD_LABELS } from '@/types/finance';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { Document, Packer, Paragraph, Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell, TextRun, WidthType, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
// Temporarily disabled charts to fix build error
// import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DateInputBR } from "@/components/ui/date-input-br";

type RecordType = 'all' | 'income' | 'expense';

interface ReportItem {
  id: string;
  date: string;
  type: 'income' | 'expense';
  description: string;
  category: string;
  subcategory: string;
  paymentMethod: string;
  settlement: string;
  amount: number;
}

const NoDataPlaceholder = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-col items-center justify-center h-[400px] text-center text-muted-foreground bg-muted/50 rounded-lg">
    <PieChartIcon className="w-16 h-16 mb-4 opacity-30" />
    <h3 className="text-lg font-semibold">Sem dados para exibir</h3>
    <p className="text-sm">{children}</p>
  </div>
);

// Helper function outside component to avoid initialization errors
const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function Reports() {
  useIdleTimeout(); // Set up idle timeout for this page

  const { user } = useAuth();
  const { expenses, categories, accounts, cards, getCategoryById, getSubcategoryById, isLoading: financeLoading } = useFinance();
  const { incomes, incomeCategories, getIncomeCategoryById, getIncomeSubcategoryById, isLoading: incomeLoading } = useIncome();
  const [activeTab, setActiveTab] = useState('visual');

  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [recordType, setRecordType] = useState<RecordType>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  // State for visual dashboard
  const [chartView, setChartView] = useState<'monthly' | 'annual'>('monthly');

  // Helper to check for data
  const hasData = useMemo(() => incomes.length > 0 || expenses.length > 0, [incomes, expenses]);

  const allCategories = useMemo(() => {
    const expenseCats = categories.map(c => ({ id: c.id, name: c.name, type: 'expense' as const }));
    const incomeCats = incomeCategories.map(c => ({ id: c.id, name: c.name, type: 'income' as const }));
    return [...expenseCats, ...incomeCats].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, incomeCategories]);

  const filteredData = useMemo((): ReportItem[] => {
    const items: ReportItem[] = [];
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    // Add expenses
    if (recordType === 'all' || recordType === 'expense') {
      expenses.forEach(expense => {
        if ((expense as any).excludeFromCalculations) return; // Blindagem de Gráficos
        const expenseDate = new Date(expense.expenseDate);
        if (expenseDate >= start && expenseDate <= end) {
          const category = getCategoryById(expense.categoryId || '');
          const subcategory = expense.subcategoryId ? getSubcategoryById(expense.subcategoryId) : null;
          
          if (selectedCategory !== 'all' && expense.categoryId !== selectedCategory) return;
          if (selectedPaymentMethod !== 'all' && expense.paymentMethod !== selectedPaymentMethod) return;

          const sMethod = (expense as any).settlementMethod;
          const sAccId = (expense as any).settlementAccountId;
          const sAcc = sAccId ? accounts.find(a => a.id === sAccId) : null;
          let settlement = '-';
          if (expense.isPaid && sMethod) {
            if (sMethod === 'credit_card') settlement = 'Outro cartão de crédito';
            else if (sMethod === 'account') settlement = sAcc ? `Débito em conta · ${sAcc.bankName}` : 'Débito em Conta';
            else if (sMethod === 'pix') settlement = sAcc ? `PIX · ${sAcc.bankName}` : 'PIX / Dinheiro';
          }

          items.push({
            id: expense.id,
            date: format(expenseDate, 'yyyy-MM-dd'),
            type: 'expense',
            description: expense.description,
            category: category?.name || 'Sem categoria',
            subcategory: subcategory?.name || '-',
            paymentMethod: PAYMENT_METHOD_LABELS[expense.paymentMethod] || expense.paymentMethod,
            settlement,
            amount: expense.amount,
          });
        }
      });
    }

    // Add incomes
    if (recordType === 'all' || recordType === 'income') {
      incomes.forEach(income => {
        if (income.excludeFromCalculations) return; // Blindagem de Gráficos
        const incomeDate = new Date(income.receiveDate);
        if (incomeDate >= start && incomeDate <= end) {
          const category = getIncomeCategoryById(income.categoryId || '');
          const subcategory = income.subcategoryId ? getIncomeSubcategoryById(income.subcategoryId) : null;
          
          if (selectedCategory !== 'all' && income.categoryId !== selectedCategory) return;
          // Income doesn't have payment method, skip this filter for incomes
          if (selectedPaymentMethod !== 'all' && recordType !== 'income') return;

          items.push({
            id: income.id,
            date: format(incomeDate, 'yyyy-MM-dd'),
            type: 'income',
            description: income.title,
            category: category?.name || 'Sem categoria',
            subcategory: subcategory?.name || '-',
            paymentMethod: '-',
            settlement: '-',
            amount: income.amount,
          });
        }
      });
    }

    return items.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [expenses, incomes, startDate, endDate, recordType, selectedCategory, selectedPaymentMethod, getCategoryById, getSubcategoryById, getIncomeCategoryById, getIncomeSubcategoryById]);

  const totals = useMemo(() => {
    const incomeTotal = filteredData.filter(i => i.type === 'income').reduce((sum, i) => sum + i.amount, 0);
    const expenseTotal = filteredData.filter(i => i.type === 'expense').reduce((sum, i) => sum + i.amount, 0);
    return { income: incomeTotal, expense: expenseTotal, balance: incomeTotal - expenseTotal };
  }, [filteredData]);

  // Data for Comparative Chart (Optimized)
  const comparativeChartData = useMemo(() => {
    const currentYear = new Date().getFullYear();

    if (chartView === 'monthly') {
      // Initialize an array for 12 months
      const monthlyData = Array.from({ length: 12 }, () => ({ Ganhos: 0, Gastos: 0 }));

      // Single pass over incomes
      incomes.forEach(inc => {
        if (inc.excludeFromCalculations) return;
        const d = new Date(inc.receiveDate);
        if (d.getFullYear() === currentYear) {
          monthlyData[d.getMonth()].Ganhos += inc.amount;
        }
      });

      // Single pass over expenses
      expenses.forEach(exp => {
        if ((exp as any).excludeFromCalculations) return;
        const d = new Date(exp.dueDate);
        if (d.getFullYear() === currentYear) {
          monthlyData[d.getMonth()].Gastos += exp.amount;
        }
      });

      // Map to final chart format
      return monthlyData.map((data, i) => {
        const monthName = format(new Date(currentYear, i), 'MMM', { locale: ptBR });
        return {
          name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
          ...data,
        };
      });
    } else { // annual
      const annualData: Record<string, { Ganhos: number, Gastos: number }> = {};
      const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
      
      // Initialize data structure for the last 5 years
      years.forEach(year => {
        annualData[year] = { Ganhos: 0, Gastos: 0 };
      });

      // Single pass over incomes
      incomes.forEach(inc => {
        if (inc.excludeFromCalculations) return;
        const year = new Date(inc.receiveDate).getFullYear();
        if (annualData[year]) {
          annualData[year].Ganhos += inc.amount;
        }
      });

      // Single pass over expenses
      expenses.forEach(exp => {
        if ((exp as any).excludeFromCalculations) return;
        const year = new Date(exp.dueDate).getFullYear();
        if (annualData[year]) {
          annualData[year].Gastos += exp.amount;
        }
      });

      // Map to final chart format
      return Object.entries(annualData)
        .map(([year, data]) => ({
          name: year,
          ...data,
        }))
        .reverse();
    }
  }, [incomes, expenses, chartView]);

  // Data for Projection Chart
  const projectionData = useMemo(() => {
    if (!incomes || !expenses) return [];

    let totalReceived = 0;
    let totalPaid = 0;
    let totalIncome = 0;
    let totalExpense = 0;
    const allDates: number[] = [];
    incomes.forEach(i => {
      if (i.excludeFromCalculations) return;
      if (i.isReceived) totalReceived += i.amount;
      totalIncome += i.amount;
      const time = new Date(i.receiveDate).getTime();
      if (!isNaN(time)) allDates.push(time);
    });

    expenses.forEach(e => {
      if ((e as any).excludeFromCalculations) return;
      if (e.isPaid) totalPaid += e.amount;
      totalExpense += e.amount;
      const time = new Date(e.expenseDate).getTime();
      if (!isNaN(time)) allDates.push(time);
    });

    const currentBalance = totalReceived - totalPaid;

    if (allDates.length === 0) {
      return [];
    }

    const firstTransactionDate = new Date(Math.min(...allDates));
    const monthsOfHistory = Math.max(1, (new Date().getFullYear() - firstTransactionDate.getFullYear()) * 12 + (new Date().getMonth() - firstTransactionDate.getMonth()) + 1);
    
    const averageMonthlyIncome = totalIncome / monthsOfHistory;
    const averageMonthlyExpense = totalExpense / monthsOfHistory;

    let projectedBalance = currentBalance;
    const projData = Array.from({ length: 12 }, (_, i) => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + i + 1);
      projectedBalance += averageMonthlyIncome - averageMonthlyExpense;
      return { name: format(futureDate, 'MMM/yy', { locale: ptBR }), Saldo: projectedBalance };
    });

    return projData;
  }, [incomes, expenses]);

  // Total Available Balance
  const totalAvailableBalance = useMemo(() => {
    if (!incomes || !expenses) return 0;
    const totalReceived = incomes.filter(i => i.isReceived && !i.excludeFromCalculations).reduce((sum, i) => sum + i.amount, 0);
    const totalPaid = expenses.filter(e => e.isPaid && !(e as any).excludeFromCalculations).reduce((sum, e) => sum + e.amount, 0);
    return totalReceived - totalPaid;
  }, [incomes, expenses]);

  // AI Insight Logic (Separated)
  const aiInsight = useMemo(() => {
    if (!incomes || !expenses || !categories) return 'Carregando análise...';
    if (incomes.length === 0 && expenses.length === 0) return 'Adicione transações para receber insights.';

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // 1. Trend Analysis
    const getMonthExpenses = (offset: number) => {
      const d = new Date(currentYear, currentMonth + offset, 1);
      return expenses.filter(e => {
        if ((e as any).excludeFromCalculations) return false;
        const ed = new Date(e.dueDate);
        return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear();
      });
    };

    const currentExpensesList = getMonthExpenses(0);
    const currentMonthExpenses = currentExpensesList.reduce((sum, e) => sum + e.amount, 0);
    
    let prev3MonthsAvg = 0;
    for(let i=1; i<=3; i++) {
      prev3MonthsAvg += getMonthExpenses(-i).reduce((sum, e) => sum + e.amount, 0);
    }
    prev3MonthsAvg /= 3;

    let trendAnalysis = "";
    if (prev3MonthsAvg > 0) {
      if (currentMonthExpenses > prev3MonthsAvg * 1.1) {
        const catTotals: Record<string, number> = {};
        currentExpensesList.forEach(e => {
          const catName = categories.find(c => c.id === e.categoryId)?.name || 'Outros';
          catTotals[catName] = (catTotals[catName] || 0) + e.amount;
        });
        const topCat = Object.entries(catTotals).sort((a,b) => b[1] - a[1])[0];
        trendAnalysis = `📈 Seus gastos subiram em relação à média recente. A categoria '${topCat?.[0]}' foi a maior responsável.`;
      } else if (currentMonthExpenses < prev3MonthsAvg * 0.9) {
        trendAnalysis = `📉 Ótimo! Você reduziu seus gastos comparado à média dos últimos 3 meses.`;
      } else {
        trendAnalysis = `📊 Seus gastos estão estáveis, dentro da média recente.`;
      }
    } else {
      trendAnalysis = `📊 Iniciando análise de tendências (coletando histórico).`;
    }

    // 2. Projection & Goals
    const currentMonthIncomes = incomes.filter(i => {
      if (i.excludeFromCalculations) return false;
      const d = new Date(i.receiveDate);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).reduce((sum, i) => sum + i.amount, 0);

    const balance = currentMonthIncomes - currentMonthExpenses;
    
    let projection = "";
    if (balance > 0) {
      const projectedYear = balance * 12;
      projection = `🚀 Economizando ${formatMoney(balance)} todo mês, em 1 ano você terá **${formatMoney(projectedYear)}**! Sugestão: Aplique na sua Reserva de Emergência.`;
    } else {
      projection = `🛑 Atenção: Seus gastos superaram os ganhos este mês em ${formatMoney(Math.abs(balance))}. Priorize quitar dívidas antes de investir.`;
    }

    // 3. Actionable Tip
    let tip = "";
    const fees = currentExpensesList.filter(e => {
      const desc = (e.description || '').toLowerCase();
      const cat = (categories.find(c => c.id === e.categoryId)?.name || '').toLowerCase();
      return desc.includes('taxa') || desc.includes('tarifa') || desc.includes('anuidade') || cat.includes('banco');
    }).reduce((s, e) => s + e.amount, 0);

    if (fees > 20) {
      tip = `💡 Dica Prática: Você gastou ${formatMoney(fees)} com taxas bancárias. Considere uma conta digital gratuita.`;
    } else {
      const catTotals: Record<string, number> = {};
      currentExpensesList.forEach(e => {
        const catName = categories.find(c => c.id === e.categoryId)?.name || 'Outros';
        catTotals[catName] = (catTotals[catName] || 0) + e.amount;
      });
      const topCat = Object.entries(catTotals).sort((a,b) => b[1] - a[1])[0];
      if (topCat) {
        tip = `💡 Dica Prática: '${topCat[0]}' representa uma grande parte do seu orçamento. Tente reduzir 10% nessa categoria.`;
      } else {
        tip = `💡 Dica Prática: Revise assinaturas e pequenos gastos diários.`;
      }
    }

    return `${trendAnalysis}\n\n${projection}\n\n${tip}`;
  }, [incomes, expenses, categories]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getReportPeriod = () => {
    return `${format(parseISO(startDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} a ${format(parseISO(endDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`;
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('Relatório Financeiro', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Usuário: ${user?.email || 'N/A'}`, 14, 35);
    doc.text(`Período: ${getReportPeriod()}`, 14, 42);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 49);

    // Summary
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text('Resumo', 14, 62);
    
    doc.setFontSize(10);
    doc.setTextColor(34, 139, 34);
    doc.text(`Total de Receitas: ${formatCurrency(totals.income)}`, 14, 70);
    doc.setTextColor(220, 20, 60);
    doc.text(`Total de Despesas: ${formatCurrency(totals.expense)}`, 14, 77);
    doc.setTextColor(totals.balance >= 0 ? 34 : 220, totals.balance >= 0 ? 139 : 20, totals.balance >= 0 ? 34 : 60);
    doc.text(`Saldo: ${formatCurrency(totals.balance)}`, 14, 84);

    // Table
    const tableData = filteredData.map(item => [
      format(parseISO(item.date), 'dd/MM/yyyy'),
      item.type === 'income' ? 'Receita' : 'Despesa',
      item.description,
      item.category,
      item.subcategory,
      item.paymentMethod,
      item.settlement,
      formatCurrency(item.amount),
    ]);

    autoTable(doc, {
      startY: 95,
      head: [['Data', 'Tipo', 'Descrição', 'Categoria', 'Subcategoria', 'Forma Pagto', 'Quitação', 'Valor']],
      body: tableData,
      foot: [['', '', '', '', '', '', 'Total Geral:', formatCurrency(totals.income - totals.expense)]],
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      footStyles: { fillColor: [240, 240, 240], textColor: [40, 40, 40], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Página ${i} de ${pageCount} - Relatório gerado por MeuBudget`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    doc.save(`relatorio-financeiro-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MeuBudget';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Relatório');

    // Set column widths
    worksheet.columns = [
      { width: 15 },
      { width: 12 },
      { width: 30 },
      { width: 18 },
      { width: 16 },
      { width: 20 },
      { width: 26 },
      { width: 16 },
    ];

    // Header rows
    worksheet.addRow(['Relatório Financeiro']);
    worksheet.addRow([`Usuário: ${user?.email || 'N/A'}`]);
    worksheet.addRow([`Período: ${getReportPeriod()}`]);
    worksheet.addRow([`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`]);
    worksheet.addRow([]);
    
    // Summary section
    worksheet.addRow(['Resumo']);
    const incomeRow = worksheet.addRow(['Total de Receitas', totals.income]);
    incomeRow.getCell(2).numFmt = '"R$" #,##0.00';
    incomeRow.getCell(1).font = { color: { argb: 'FF228B22' } };
    
    const expenseRow = worksheet.addRow(['Total de Despesas', totals.expense]);
    expenseRow.getCell(2).numFmt = '"R$" #,##0.00';
    expenseRow.getCell(1).font = { color: { argb: 'FFDC143C' } };
    
    const balanceRow = worksheet.addRow(['Saldo', totals.balance]);
    balanceRow.getCell(2).numFmt = '"R$" #,##0.00';
    balanceRow.getCell(1).font = { bold: true };
    
    worksheet.addRow([]);
    
    // Table header
    const headerRow = worksheet.addRow(['Data', 'Tipo', 'Descrição', 'Categoria', 'Subcategoria', 'Forma de Pagamento', 'Quitação', 'Valor']);
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3B82F6' },
      };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center' };
    });

    // Data rows
    filteredData.forEach(item => {
      const row = worksheet.addRow([
        format(parseISO(item.date), 'dd/MM/yyyy'),
        item.type === 'income' ? 'Receita' : 'Despesa',
        item.description,
        item.category,
        item.subcategory,
        item.paymentMethod,
        item.settlement,
        item.amount,
      ]);
      row.getCell(8).numFmt = '"R$" #,##0.00';
    });

    // Total row
    worksheet.addRow([]);
    const totalRow = worksheet.addRow(['', '', '', '', '', '', 'Total Geral:', totals.income - totals.expense]);
    totalRow.getCell(7).font = { bold: true };
    totalRow.getCell(8).font = { bold: true };
    totalRow.getCell(8).numFmt = '"R$" #,##0.00';
    totalRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F0F0' },
      };
    });

    // Generate file and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `relatorio-financeiro-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const exportToWord = async () => {
    const tableRows = [
      new DocxTableRow({
        children: ['Data', 'Tipo', 'Descrição', 'Categoria', 'Subcategoria', 'Forma Pagto', 'Quitação', 'Valor'].map(text => 
          new DocxTableCell({
            children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
            shading: { fill: '3B82F6' },
          })
        ),
      }),
      ...filteredData.map(item => 
        new DocxTableRow({
          children: [
            format(parseISO(item.date), 'dd/MM/yyyy'),
            item.type === 'income' ? 'Receita' : 'Despesa',
            item.description,
            item.category,
            item.subcategory,
            item.paymentMethod,
            item.settlement,
            formatCurrency(item.amount),
          ].map(text => 
            new DocxTableCell({
              children: [new Paragraph({ text: String(text) })],
            })
          ),
        })
      ),
      new DocxTableRow({
        children: [
          ...['', '', '', '', '', '', 'Total Geral:'].map(text => 
            new DocxTableCell({
              children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
              shading: { fill: 'F0F0F0' },
            })
          ),
          new DocxTableCell({
            children: [new Paragraph({ children: [new TextRun({ text: formatCurrency(totals.balance), bold: true })] })],
            shading: { fill: 'F0F0F0' },
          }),
        ],
      }),
    ];

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: 'Relatório Financeiro',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: `Usuário: ${user?.email || 'N/A'}` }),
          new Paragraph({ text: `Período: ${getReportPeriod()}` }),
          new Paragraph({ text: `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}` }),
          new Paragraph({ text: '' }),
          new Paragraph({
            text: 'Resumo',
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({ children: [new TextRun({ text: `Total de Receitas: ${formatCurrency(totals.income)}`, color: '228B22' })] }),
          new Paragraph({ children: [new TextRun({ text: `Total de Despesas: ${formatCurrency(totals.expense)}`, color: 'DC143C' })] }),
          new Paragraph({ children: [new TextRun({ text: `Saldo: ${formatCurrency(totals.balance)}`, bold: true })] }),
          new Paragraph({ text: '' }),
          new Paragraph({
            text: 'Detalhamento',
            heading: HeadingLevel.HEADING_2,
          }),
          new DocxTable({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows,
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            text: `Relatório gerado por MeuBudget em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
            alignment: AlignmentType.CENTER,
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `relatorio-financeiro-${format(new Date(), 'yyyy-MM-dd')}.docx`);
  };

  if (financeLoading || incomeLoading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Gráficos e Relatórios
          </h1>
          <p className="text-muted-foreground">Gere relatórios detalhados e visualize suas finanças</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="visual">Visão Gráfica</TabsTrigger>
          <TabsTrigger value="detailed">Relatório Detalhado</TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Relatórios IA
          </TabsTrigger>
          <TabsTrigger value="receipts" className="flex items-center gap-1.5">
            <ScanLine className="w-3.5 h-3.5" />
            Comprovantes
          </TabsTrigger>
        </TabsList>

        {/* Visual Dashboard Tab */}
        <TabsContent value="visual">
          {!hasData ? (
            <NoDataPlaceholder>Adicione transações para visualizar os gráficos.</NoDataPlaceholder>
          ) : (
            <div className="space-y-6 animate-in fade-in-50">
              {/* Total Balance Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Saldo Total Disponível</CardTitle>
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${totalAvailableBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(totalAvailableBalance)}
                  </div>
                  <p className="text-xs text-muted-foreground">Soma de todas as receitas recebidas menos despesas pagas.</p>
                </CardContent>
              </Card>

              {/* Comparative Chart */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle>Ganhos vs. Gastos</CardTitle>
                      <CardDescription>Comparativo de receitas e despesas.</CardDescription>
                    </div>
                    <Tabs value={chartView} onValueChange={(v) => setChartView(v as 'monthly' | 'annual')} className="mt-4 sm:mt-0">
                      <TabsList>
                        <TabsTrigger value="monthly">Mensal</TabsTrigger>
                        <TabsTrigger value="annual">Anual</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={comparativeChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value / 1000}k`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend />
                      <Bar dataKey="Ganhos" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Gastos" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Projection Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Projeção de Saldo</CardTitle>
                  <CardDescription>Estimativa do seu saldo para os próximos 12 meses.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={projectionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value / 1000}k`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="Saldo" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* AI Insight */}
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5 text-primary" /> Insight da IA</CardTitle>
                </CardHeader>
                <CardContent><p className="text-sm text-foreground whitespace-pre-line">{aiInsight}</p></CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Detailed Report Tab */}
        <TabsContent value="detailed">
          <div className="space-y-6 animate-in fade-in-50">
            {/* Export Button */}
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="gradient-primary">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar como...
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportToPDF}>
                    <FileText className="w-4 h-4 mr-2 text-red-500" />
                    Exportar PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToExcel}>
                    <FileSpreadsheet className="w-4 h-4 mr-2 text-green-500" />
                    Exportar Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToWord}>
                    <FileType className="w-4 h-4 mr-2 text-blue-500" />
                    Exportar Word
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Filter className="w-5 h-5" />
                  Filtros do Relatório
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Data Início
                    </Label>
                    <DateInputBR
                      id="startDate"
                      value={startDate}
                      onChange={setStartDate}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Data Fim
                    </Label>
                    <DateInputBR
                      id="endDate"
                      value={endDate}
                      onChange={setEndDate}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={recordType} onValueChange={(v) => setRecordType(v as RecordType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="income">Receitas</SelectItem>
                        <SelectItem value="expense">Despesas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {allCategories
                          .filter(c => recordType === 'all' || c.type === recordType)
                          .map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name} ({cat.type === 'income' ? 'Receita' : 'Despesa'})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Forma de Pagamento</Label>
                    <Select 
                      value={selectedPaymentMethod} 
                      onValueChange={setSelectedPaymentMethod}
                      disabled={recordType === 'income'}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="account">Conta Bancária</SelectItem>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Total de Receitas</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.income)}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-red-500">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Total de Despesas</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(totals.expense)}</p>
                </CardContent>
              </Card>
              <Card className={`border-l-4 ${totals.balance >= 0 ? 'border-l-blue-500' : 'border-l-orange-500'}`}>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Saldo do Período</p>
                  <p className={`text-2xl font-bold ${totals.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    {formatCurrency(totals.balance)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Data Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Registros ({filteredData.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredData.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum registro encontrado para os filtros selecionados.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Subcategoria</TableHead>
                          <TableHead>Forma de Pagamento</TableHead>
                          <TableHead>Quitação</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredData.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{format(parseISO(item.date), 'dd/MM/yyyy')}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                item.type === 'income' 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                                {item.type === 'income' ? 'Receita' : 'Despesa'}
                              </span>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">{item.description}</TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell>{item.subcategory}</TableCell>
                            <TableCell>{item.paymentMethod}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{item.settlement}</TableCell>
                            <TableCell className={`text-right font-medium ${
                              item.type === 'income' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {item.type === 'income' ? '+' : '-'} {formatCurrency(item.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Report Generator Tab */}
        <TabsContent value="ai">
          <div className="animate-in fade-in-50">
            <AIReportGenerator />
          </div>
        </TabsContent>

        {/* Receipt OCR Tab */}
        <TabsContent value="receipts">
          <div className="animate-in fade-in-50 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <ScanLine className="w-5 h-5 text-primary" />
                Leitura de Comprovantes
              </h2>
              <p className="text-sm text-muted-foreground">
                Envie um comprovante de pagamento e a IA extrai e estrutura os dados automaticamente.
              </p>
            </div>
            <ReceiptUploader />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
