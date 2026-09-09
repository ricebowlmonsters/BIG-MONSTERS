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
    var salary = controls.skenarioPendapatan === 'Real' ? value(outlet.salary) : projected ? value(outlet.salary) : revenue * selectedRatio.salary;
    var electricity = controls.skenarioPendapatan === 'Real' ? value(outlet.electricity) : projected ? value(outlet.electricity) : revenue * selectedRatio.electricity;
    var other = controls.skenarioPendapatan === 'Real' ? value(outlet.other) : projected ? value(outlet.other) : revenue * selectedRatio.other;
    var nonOperating = controls.skenarioPendapatan === 'Real' ? value(outlet.nonOperating) : projected ? value(outlet.nonOperating) : revenue * selectedRatio.nonOperating;
    var grossProfit = revenue - hpp;
    var opex = salary + electricity + other;
    var contributionMargin = ratio(grossProfit, revenue);
    var fixedCost = opex + nonOperating;
    var bep = calculateBep(fixedCost, contributionMargin);
    var standardSalary = revenue * selectedRatio.salary, standardElectricity = revenue * selectedRatio.electricity, standardOther = revenue * selectedRatio.other, standardOpex = standardSalary + standardElectricity + standardOther, standardNonOperating = revenue * selectedRatio.nonOperating;
    return { id: outlet.id, name: outlet.name, costCenter: outlet.costCenter, revenue: revenue, realRevenue: realRevenue, hpp: hpp, hppRealPercent: ratio(value(outlet.hpp), realRevenue), hppStandard: revenue * selectedRatio.hpp, hppStandardPercent: selectedRatio.hpp, hppHealthy: revenue * RATIOS.standard.hpp, hppHealthyPercent: RATIOS.standard.hpp, grossProfit: grossProfit, salary: salary, electricity: electricity, other: other, opex: opex, nonOperating: nonOperating, fixedCost: fixedCost, netProfit: grossProfit - fixedCost, contributionMargin: contributionMargin, bep: bep, gap: revenue - bep, bepPlusTen: bep * FORMULAS.BEP_BUFFER, achieved: outlet.costCenter ? null : revenue - bep >= 0, standardSalary: standardSalary, standardElectricity: standardElectricity, standardOther: standardOther, standardOpex: standardOpex, standardNonOperating: standardNonOperating };
  }
  function calculateReport(outlets, controls) {
    var rows = outlets.map(function (outlet) { return calculateFinancialRow(outlet, controls); });
    var total = rows.reduce(function (result, row) { ['revenue', 'hpp', 'grossProfit', 'salary', 'electricity', 'other', 'opex', 'nonOperating', 'fixedCost', 'netProfit', 'bep', 'gap', 'bepPlusTen', 'standardSalary', 'standardElectricity', 'standardOther', 'standardOpex', 'standardNonOperating'].forEach(function (key) { result[key] += row[key] || 0; }); return result; }, { id: 'total', name: 'Total Konsolidasi', revenue: 0, hpp: 0, grossProfit: 0, salary: 0, electricity: 0, other: 0, opex: 0, nonOperating: 0, fixedCost: 0, netProfit: 0, bep: 0, gap: 0, bepPlusTen: 0, standardSalary: 0, standardElectricity: 0, standardOther: 0, standardOpex: 0, standardNonOperating: 0 });
    total.contributionMargin = ratio(total.grossProfit, total.revenue); total.hppRealPercent = ratio(total.hpp, total.revenue); total.hppStandard = total.revenue * RATIOS[controls.standarAcuanBiaya === 'Standar' ? 'standard' : 'nonStandard'].hpp; total.hppStandardPercent = RATIOS[controls.standarAcuanBiaya === 'Standar' ? 'standard' : 'nonStandard'].hpp; total.hppHealthy = total.revenue * RATIOS.standard.hpp; total.hppHealthyPercent = RATIOS.standard.hpp; total.achievedCount = rows.filter(function (row) { return row.achieved === true; }).length; total.pendingCount = rows.filter(function (row) { return row.achieved === false; }).length; total.bepAchievement = ratio(total.revenue, total.bep);
    return { rows: rows, total: total, ratios: RATIOS[controls.standarAcuanBiaya === 'Standar' ? 'standard' : 'nonStandard'] };
  }
  global.RbmBepCalculations = { RATIOS: RATIOS, FORMULAS: FORMULAS, calculateFinancialRow: calculateFinancialRow, calculateReport: calculateReport, calculateRealBep: calculateRealBep, ratio: ratio };
}(window));