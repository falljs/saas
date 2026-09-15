import { DatePipe } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { StatistiqueService } from 'src/app/services/statistique.service';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { Router } from '@angular/router';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { UserService } from 'src/app/services/user.service';
import { parseISO, startOfWeek, addDays, format, isSameDay, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

type ProductMode = 'today' | 'date' | 'range';

interface ProduitVente {
  produit: string;
  qty_init: number;
  sum_qty: number;
  qty_rest: number;
  perCent: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  // ---- Produits les plus vendus (mode unifié) ----
  mode: ProductMode = 'today';
  search = '';

  produitsToday: ProduitVente[] = [];
  produitsDate: ProduitVente[] = [];
  produitsRange: ProduitVente[] = [];

  selectedDate: string | null = null;
  rangeStart: string | null = null;
  rangeEnd: string | null = null;

  selectedDateLabel = '';
  selectedRangeLabel = '';

  // ---- KPI ----
  commandesDuJour = 0;
  commandesDuJourInvalide = 0;
  beneficeDuJour = 0;           // facturé

  // ---- Graphique ----
  startDate = '';
  endDate = '';

  globalDate: string | null = null;

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  public chartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [{
      data: [],
      label: 'Total TTC',
      fill: true,
      borderColor: '#206bc4',
      backgroundColor: 'rgba(32,107,196,0.15)',
      tension: 0.4,
      pointRadius: 3
    }]
  };

  public chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'top' } },
    scales: {
      x: { ticks: { maxRotation: 45, minRotation: 0 } },
      y: { beginAtZero: true }
    }
  };

  firstRoleName: string | null = null;

  get todayLabel(): string {
    return format(new Date(), 'EEEE dd MMMM yyyy', { locale: fr });
  }

  get currentList(): ProduitVente[] {
    switch (this.mode) {
      case 'date': return this.produitsDate;
      case 'range': return this.produitsRange;
      default: return this.produitsToday;
    }
  }

  get filteredList(): ProduitVente[] {
    const term = this.search.trim().toLowerCase();
    if (!term) return this.currentList;
    return this.currentList.filter(p => p.produit.toLowerCase().includes(term));
  }

  get modeLabel(): string {
    switch (this.mode) {
      case 'date': return this.selectedDateLabel ? `le ${this.selectedDateLabel}` : 'à une date précise';
      case 'range': return this.selectedRangeLabel || 'sur une période';
      default: return this.todayLabel;
    }
  }

  get emptyMessage(): string {
    switch (this.mode) {
      case 'date': return 'Aucune vente enregistrée pour cette date.';
      case 'range': return 'Aucune vente enregistrée sur cette période.';
      default: return 'Aucune vente effectuée pour le moment.';
    }
  }

  get isFilterActive(): boolean {
    return this.search.trim().length > 0
      || !!this.selectedDate
      || (!!this.rangeStart && !!this.rangeEnd)
      || (!!this.startDate && !!this.endDate);
  }

  constructor(
    public statistiqueService: StatistiqueService,
    public userService: UserService,
    private datePipe: DatePipe,
    public router: Router,
    public localStorageService: LocalStorageService
  ) { }

  ngOnInit() {
    this.getMostSeller();
    this.getChartData();
    this.getInfo();
    this.getBenefice();
    this.refreshRoleAndPermissonsUser();

    if (this.userService.user.roles?.length) {
      this.firstRoleName = this.userService.user.roles[0].name;
    }
  }

  setMode(mode: ProductMode) {
    this.mode = mode;
    this.search = '';
  }

  // ---- Calcul du % de vente, unifié pour les 3 modes ----
  private computePercent(list: any[]): ProduitVente[] {
    return list.map(p => {
      const qtyOut = Number(p.sum_qty) || 0;
      const qtyRest = Number(p.qty_rest) || 0;
      const qtyInit = p.qty_init != null ? Number(p.qty_init) : (qtyRest + qtyOut);
      return {
        produit: p.produit,
        qty_init: qtyInit,
        sum_qty: qtyOut,
        qty_rest: qtyRest,
        perCent: qtyInit > 0 ? Math.round((qtyOut * 100) / qtyInit) : 0
      };
    });
  }

  getMostSeller() {
    this.statistiqueService.getMostSeller().subscribe(res => {
      this.produitsToday = this.computePercent(res as any[]);
    });
  }

  onSelectedDateChange(ctrl: any) {
    if (!ctrl.value) { this.selectedDate = null; return; }
    const date = this.datePipe.transform(ctrl.value, 'yyyy-MM-dd')!;
    this.selectedDate = date;
    this.selectedDateLabel = format(parseISO(date), 'EEEE dd MMMM yyyy', { locale: fr });

    this.statistiqueService.getMostSellerByDate(date).subscribe(res => {
      this.produitsDate = this.computePercent(res as any[]);
    });
  }

  onRangeStartChange(ctrl: any) {
    this.rangeStart = ctrl.value ? this.datePipe.transform(ctrl.value, 'yyyy-MM-dd') : null;
    this.rangeEnd = null;
  }

  onRangeEndChange(ctrl: any) {
    if (!ctrl.value || !this.rangeStart) return;
    this.rangeEnd = this.datePipe.transform(ctrl.value, 'yyyy-MM-dd')!;
    this.selectedRangeLabel =
      `du ${format(parseISO(this.rangeStart), 'dd MMMM yyyy', { locale: fr })} ` +
      `au ${format(parseISO(this.rangeEnd), 'dd MMMM yyyy', { locale: fr })}`;

    this.statistiqueService.getMostSellerBy2Date(this.rangeStart, this.rangeEnd).subscribe(res => {
      this.produitsRange = this.computePercent(res as any[]);
    });
  }

  // ---- KPI ----
  get kpiPeriodLabel(): string {
    return this.globalDate
      ? format(parseISO(this.globalDate), 'dd MMM yyyy', { locale: fr })
      : "aujourd'hui";
  }

  onGlobalDateChange(ctrl: any) {
    const date = ctrl?.value ? this.datePipe.transform(ctrl.value, 'yyyy-MM-dd') : null;
    this.globalDate = date;
    date ? this.applyGlobalDate(date) : this.resetToLive();
  }

  private applyGlobalDate(date: string) {

    this.getInfo(date);

    this.statistiqueService.getBeneficeByDate(date).subscribe((res: any) => {

      this.beneficeDuJour =
        Number(res.total_benefice_produits ?? 0);

    });

    // Synchronise la carte "produits les plus vendus"
    this.mode = 'date';
    this.selectedDate = date;

    this.selectedDateLabel = format(
      parseISO(date),
      'EEEE dd MMMM yyyy',
      { locale: fr }
    );

    this.statistiqueService.getMostSellerByDate(date).subscribe(res => {
      this.produitsDate = this.computePercent(res as any[]);
    });

    // Synchronise le graphique
    this.startDate = date;
    this.endDate = date;

    this.getChartDataDates();
  }

  private resetToLive() {
    this.mode = 'today';
    this.startDate = '';
    this.endDate = '';
    this.getInfo();
    this.getBenefice();
    this.getChartData();
  }

  getInfo(date?: string) {
    this.statistiqueService.getInfo(date).subscribe((res: any) => {
      this.commandesDuJour = res.commandesDuJour.length;
      this.commandesDuJourInvalide = res.commandesDuJourInvalide.length;
    });
  }
  // ---- END KPI ----

  getBenefice() {
    this.statistiqueService.getBenefice().subscribe((res: any) => {

      this.beneficeDuJour =
        Number(res.total_benefice_produits ?? 0);

    });
  }

  // ---- Graphique (logique inchangée) ----
  getChartData() {
    this.statistiqueService.getVentesParJour().subscribe(data => {
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const labels: string[] = [];
      const values: number[] = [];

      for (let i = 0; i < 7; i++) {
        const currentDate = addDays(weekStart, i);
        labels.push(format(currentDate, 'dd-MM-yyyy'));
        const entry = data.find(item => isSameDay(parseISO(item.date), currentDate));
        values.push(entry ? entry.total : 0);
      }

      this.chartData = {
        labels,
        datasets: [{
          data: values,
          label: 'Total TTC (Semaine en cours)',
          fill: true,
          borderColor: '#206bc4',
          backgroundColor: 'rgba(32,107,196,0.15)',
          tension: 0.4,
          pointRadius: 3
        }]
      };
      setTimeout(() => this.chart?.update(), 0);
    });
  }

  getChartDataDates() {
    if (!this.startDate || !this.endDate) return;

    this.statistiqueService.getVentesParJourFexible(this.startDate, this.endDate).subscribe(data => {
      const labels: string[] = [];
      const values: number[] = [];
      const start = parseISO(this.startDate);
      const end = parseISO(this.endDate);
      const nbDays = differenceInDays(end, start);
      const startStr = format(start, 'EEEE dd MMMM yyyy', { locale: fr });
      const endStr = format(end, 'EEEE dd MMMM yyyy', { locale: fr });

      for (let i = 0; i <= nbDays; i++) {
        const currentDate = addDays(start, i);
        const vente = data.find(item => isSameDay(parseISO(item.date), currentDate));
        values.push(vente ? vente.total : 0);
        labels.push((nbDays <= 7 || i === 0 || i === nbDays) ? format(currentDate, 'dd-MM-yyyy') : '');
      }

      this.chartData = {
        labels,
        datasets: [{
          data: values,
          label: `Total TTC du ${startStr} au ${endStr}`,
          fill: true,
          borderColor: '#206bc4',
          backgroundColor: 'rgba(32,107,196,0.15)',
          tension: 0.4,
          pointRadius: 3
        }]
      };
      setTimeout(() => this.chart?.update(), 0);
    });
  }

  onDateChange() {
    this.getChartDataDates();
  }

  refreshRoleAndPermissonsUser(): void {
    this.userService.refreshRoleAndPermissonsUser(this.userService.user.id).subscribe(data => {
      const resp: any = data;
      this.userService.user.permissions = resp.user.permissions;
      this.userService.setRoles(resp.user.roles);
    });
  }

  routeFrais() {
    this.localStorageService.clearLocalStorage(['user', 'token', 'payment']);
    this.router.navigate(['/frais']);
  }

  routeRapport() {
    this.localStorageService.clearLocalStorage(['user', 'token', 'payment']);
    this.router.navigate(['/rapport']);
  }

  printDashboard() {
    const content = document.getElementById('dashboard-print');
    if (!content) return;
    const clone = content.cloneNode(true) as HTMLElement;

    clone.querySelectorAll<HTMLElement>('[data-print-section]').forEach(section => {
      section.style.maxHeight = 'none';
      section.style.height = 'auto';
      section.style.overflow = 'visible';
    });

    const remaining = clone.querySelectorAll('[data-print-section]').length;
    if (remaining === 0) {
      const msg = document.createElement('div');
      msg.className = 'text-center text-muted p-5';
      msg.innerText = 'Aucune donnée à imprimer pour la sélection actuelle.';
      clone.appendChild(msg);
    }

    const popup = window.open('', '_blank', 'width=1200,height=800');
    if (!popup) return;

    popup.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Rapport Dashboard</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
          @page { size: A4; margin: 12mm; }
          * { box-sizing: border-box; }
          body { padding: 0; margin: 0; font-family: Arial, sans-serif; font-size: 12px; }
          .card { margin-bottom: 25px; page-break-inside: avoid; break-inside: avoid; }
          .table-responsive { overflow: visible !important; max-height: none !important; height: auto !important; }
          input, button, .no-print { display: none !important; }
          .progress { display: none !important; }
          table { width: 100% !important; border-collapse: collapse; page-break-inside: auto; }
          thead { display: table-header-group; }
          tbody { display: table-row-group; }
          tr { page-break-inside: avoid; break-inside: avoid; }
          th, td { padding: 6px !important; vertical-align: middle; }
          .row { display: flex; flex-wrap: wrap; }
          [data-print-section] { width: 100% !important; max-width: 100% !important; height: auto !important; max-height: none !important; overflow: visible !important; margin-bottom: 25px; }
        </style>
      </head>
      <body>${clone.innerHTML}</body>
      </html>
    `);
    popup.document.close();
    setTimeout(() => { popup.focus(); popup.print(); popup.close(); }, 700);
  }
}