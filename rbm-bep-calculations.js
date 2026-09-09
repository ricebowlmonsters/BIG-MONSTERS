(function (global) {
  'use strict';

  var RATIOS = {
    standard: { hpp: 0.38, salary: 0.20, electricity: 0.05, other: 0.20, nonOperating: 0.02, netProfit: 0.15 },
    nonStandard: { hpp: 0.38, salary: 0.35, electricity: 0.05, other: 0.15, nonOperating: 0.01, netProfit: 0.15 }
  };
  var FORMULAS = { BEP_BUFFER: 1.10 };
  function value(number) { return Number.isFinite(Number(number)) ? Number(number) : 0; }
  function ratio(cost, revenue) { return revenue > 0 ? cost / revenue : 0; }
  function calculateBep(fixedCost, contributionMarginRate) { return contributionMarginRate > 0 ? fixedCost / contributionMarginRate : 0; }
  function calculateRealBep(outlet) {
    var revenue = value(outlet.revenue);
    var grossProfit = revenue - value(outlet.hpp);
    var contributionMargin = ratio(grossProfit, revenue);
    var fixedCost = value(outlet.salary) + value(outlet.electricity) + value(outlet.other) + value(outlet.nonOperating);
    return calculateBep(fixedCost, contributionMargin);
  }
  function calculateFinancialRow(outlet, controls) {
    var selectedRatio = RATIOS[controls.standarAcuanBiaya === 'Standar' ? 'standard' : 'nonStandard'];
    var realRevenue = value(outlet.revenue);
    var revenue = controls.skenarioPendapatan === 'Target' ? value(outlet.targetRevenue) : controls.skenarioPendapatan === 'Simulasi' ? value(outlet.simulationRevenue) : realRevenue;
    var projected = controls.simulasiMode === 'ON' && controls.skenarioPendapatan !== 'Real';
    var scale = realRevenue > 0 && projected ? revenue / realRevenue : 1;
    var hpp = projected ? value(outlet.hpp) * scale : value(outlet.hpp);
    var calculationHpp = controls.filterTampilan === 'Hanya Standar' ? revenue * selectedRatio.hpp : hpp;
    var salary = controls.skenarioPendapatan === 'Real' ? value(outlet.salary) : projected ? value(outlet.salary) : revenue * selectedRatio.salary;
    var electricity = controls.skenarioPendapatan === 'Real' ? value(outlet.electricity) : projected ? value(outlet.electricity) : revenue * selectedRatio.electricity;
    var other = controls.skenarioPendapatan === 'Real' ? value(outlet.other) : projected ? value(outlet.other) : revenue * selectedRatio.other;
    var nonOperating = controls.skenarioPendapatan === 'Real' ? value(outlet.nonOperating) : projected ? value(outlet.nonOperating) : revenue * selectedRatio.nonOperating;
    var grossProfitReal = revenue - hpp;
    var grossProfitStandard = revenue - (revenue * selectedRatio.hpp);
    var grossProfit = controls.filterTampilan === 'Hanya Standar' ? grossProfitStandard : grossProfitReal;
    var opex = salary + electricity + other;
    var contributionMargin = ratio(grossProfit, revenue);
    var fixedCost = opex + nonOperating;
    var bep = calculateBep(fixedCost, contributionMargin);
    var standardSalary = revenue * selectedRatio.salary, standardElectricity = revenue * selectedRatio.electricity, standardOther = revenue * selectedRatio.other, standardOpex = standardSalary + standardElectricity + standardOther, standardNonOperating = revenue * selectedRatio.nonOperating;
    var standardFixedCost = standardOpex + standardNonOperating;
    var standardContributionMargin = ratio(grossProfitStandard, revenue);
    var standardBep = calculateBep(standardFixedCost, standardContributionMargin);
    var realNetProfit = grossProfitReal - fixedCost;
    var standardNetProfit = grossProfitStandard - standardFixedCost;
    var realGap = revenue - bep;
    var standardGap = revenue - standardBep;
    return { id: outlet.id, name: outlet.name, costCenter: outlet.costCenter, revenue: revenue, realRevenue: realRevenue, hpp: hpp, hppRealPercent: ratio(value(outlet.hpp), realRevenue), hppStandard: revenue * selectedRatio.hpp, hppStandardPercent: selectedRatio.hpp, grossProfit: grossProfit, grossProfitReal: grossProfitReal, grossProfitStandard: grossProfitStandard, salary: salary, electricity: electricity, other: other, opex: opex, nonOperating: nonOperating, fixedCost: fixedCost, netProfit: controls.filterTampilan === 'Hanya Standar' ? standardNetProfit : realNetProfit, netProfitReal: realNetProfit, netProfitStandard: standardNetProfit, contributionMargin: contributionMargin, bep: controls.filterTampilan === 'Hanya Standar' ? standardBep : bep, bepReal: bep, bepStandard: standardBep, gap: controls.filterTampilan === 'Hanya Standar' ? standardGap : realGap, gapReal: realGap, gapStandard: standardGap, bepPlusTen: (controls.filterTampilan === 'Hanya Standar' ? standardBep : bep) * FORMULAS.BEP_BUFFER, achieved: outlet.costCenter ? null : (controls.filterTampilan === 'Hanya Standar' ? standardGap : realGap) >= 0, standardSalary: standardSalary, standardElectricity: standardElectricity, standardOther: standardOther, standardOpex: standardOpex, standardNonOperating: standardNonOperating };
  }
  function calculateReport(outlets, controls) {
    var rows = outlets.map(function (outlet) { return calculateFinancialRow(outlet, controls); });
    var total = rows.reduce(function (result, row) { ['revenue', 'hpp', 'grossProfit', 'grossProfitReal', 'grossProfitStandard', 'salary', 'electricity', 'other', 'opex', 'nonOperating', 'fixedCost', 'netProfit', 'netProfitReal', 'netProfitStandard', 'bep', 'bepReal', 'bepStandard', 'gap', 'gapReal', 'gapStandard', 'bepPlusTen', 'standardSalary', 'standardElectricity', 'standardOther', 'standardOpex', 'standardNonOperating'].forEach(function (key) { result[key] += row[key] || 0; }); return result; }, { id: 'total', name: 'Total Konsolidasi', revenue: 0, hpp: 0, grossProfit: 0, grossProfitReal: 0, grossProfitStandard: 0, salary: 0, electricity: 0, other: 0, opex: 0, nonOperating: 0, fixedCost: 0, netProfit: 0, netProfitReal: 0, netProfitStandard: 0, bep: 0, bepReal: 0, bepStandard: 0, gap: 0, gapReal: 0, gapStandard: 0, bepPlusTen: 0, standardSalary: 0, standardElectricity: 0, standardOther: 0, standardOpex: 0, standardNonOperating: 0 });
    total.contributionMargin = ratio(total.grossProfit, total.revenue); total.hppRealPercent = ratio(total.hpp, total.revenue); total.hppStandard = total.revenue * RATIOS[controls.standarAcuanBiaya === 'Standar' ? 'standard' : 'nonStandard'].hpp; total.hppStandardPercent = RATIOS[controls.standarAcuanBiaya === 'Standar' ? 'standard' : 'nonStandard'].hpp; total.achievedCount = rows.filter(function (row) { return row.achieved === true; }).length; total.pendingCount = rows.filter(function (row) { return row.achieved === false; }).length; total.bepAchievement = ratio(total.revenue, total.bep);
    return { rows: rows, total: total, ratios: RATIOS[controls.standarAcuanBiaya === 'Standar' ? 'standard' : 'nonStandard'] };
  }
  global.RbmBepCalculations = { RATIOS: RATIOS, FORMULAS: FORMULAS, calculateFinancialRow: calculateFinancialRow, calculateReport: calculateReport, calculateRealBep: calculateRealBep, ratio: ratio };
}(window));