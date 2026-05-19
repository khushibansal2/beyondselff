import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { GlassCard } from './Components';

// Recommended allocations based on risk profile
const riskProfiles = {
  conservative: { equity: 30, debt: 50, gold: 10, cash: 10 },
  moderate: { equity: 50, debt: 30, gold: 10, cash: 10 },
  aggressive: { equity: 75, debt: 15, gold: 5, cash: 5 }
};

const colors = {
  equity: '#3b82f6', // blue
  debt: '#8b5cf6', // purple
  gold: '#f59e0b', // amber
  cash: '#10b981'  // emerald
};

export default function RoboAdvisor({ financeData }) {
  const [risk, setRisk] = useState('moderate');
  
  const currentPortfolio = financeData?.portfolio || { equity: 0, debt: 0, gold: 0, cash: 0 };
  const totalValue = Object.values(currentPortfolio).reduce((a, b) => a + b, 0) || 1; // avoid /0

  // Format current allocation for chart
  const currentData = [
    { name: 'Equity', value: currentPortfolio.equity, color: colors.equity, key: 'equity' },
    { name: 'Debt', value: currentPortfolio.debt, color: colors.debt, key: 'debt' },
    { name: 'Gold', value: currentPortfolio.gold, color: colors.gold, key: 'gold' },
    { name: 'Cash', value: currentPortfolio.cash, color: colors.cash, key: 'cash' },
  ].filter(d => d.value > 0);

  // Target allocation based on selected risk
  const targetAllocation = riskProfiles[risk];
  
  const targetData = [
    { name: 'Equity', value: totalValue * (targetAllocation.equity / 100), color: colors.equity, key: 'equity' },
    { name: 'Debt', value: totalValue * (targetAllocation.debt / 100), color: colors.debt, key: 'debt' },
    { name: 'Gold', value: totalValue * (targetAllocation.gold / 100), color: colors.gold, key: 'gold' },
    { name: 'Cash', value: totalValue * (targetAllocation.cash / 100), color: colors.cash, key: 'cash' },
  ].filter(d => d.value > 0);

  // Calculate Rebalancing Actions
  const rebalanceActions = useMemo(() => {
    const actions = [];
    ['equity', 'debt', 'gold', 'cash'].forEach(asset => {
      const current = currentPortfolio[asset] || 0;
      const target = totalValue * (targetAllocation[asset] / 100);
      const diff = target - current;
      
      // Only suggest action if diff is > 5% of total value
      if (Math.abs(diff) > totalValue * 0.05) {
        actions.push({
          asset,
          type: diff > 0 ? 'BUY' : 'SELL',
          amount: Math.abs(diff),
          color: colors[asset]
        });
      }
    });
    
    // Sort so sells are first (to fund buys)
    return actions.sort((a, b) => a.type === 'SELL' ? -1 : 1);
  }, [currentPortfolio, targetAllocation, totalValue]);

  // Dynamic Tax Recommendations based on income
  const income = financeData?.income || 0;
  const taxBracket = income > 1500000 ? '30%' : income > 1000000 ? '20%' : '10%';
  
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-white/10 p-3 rounded-lg shadow-xl text-xs">
          <p className="font-bold mb-1" style={{ color: payload[0].payload.color }}>
            {payload[0].name}
          </p>
          <p className="text-slate-300">₹{Math.round(payload[0].value).toLocaleString()}</p>
          <p className="text-slate-500">{((payload[0].value / totalValue) * 100).toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Left Column: Charts */}
        <GlassCard className="flex-1">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h3 className="text-lg font-bold">Portfolio Visualizer</h3>
              <p className="text-xs text-slate-400 mt-1">Total Assets: ₹{totalValue.toLocaleString()}</p>
            </div>
            
            <div className="bg-white/5 p-1 rounded-lg border border-white/10 flex">
              {['conservative', 'moderate', 'aggressive'].map(r => (
                <button
                  key={r}
                  onClick={() => setRisk(r)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                    risk === r ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-64">
            <div className="relative">
              <h4 className="absolute top-0 left-0 right-0 text-center text-xs font-semibold text-slate-400 z-10">Current</h4>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={currentData} cx="50%" cy="55%" innerRadius={40} outerRadius={70} dataKey="value" stroke="none">
                    {currentData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="relative">
              <h4 className="absolute top-0 left-0 right-0 text-center text-xs font-semibold text-blue-400 z-10">Target ({risk})</h4>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={targetData} cx="50%" cy="55%" innerRadius={40} outerRadius={70} dataKey="value" stroke="none">
                    {targetData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {['Equity', 'Debt', 'Gold', 'Cash'].map(asset => (
              <div key={asset} className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase tracking-wider">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[asset.toLowerCase()] }} />
                {asset}
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Right Column: Rebalancing & Tax */}
        <div className="flex-1 space-y-6">
          
          {/* Rebalancing Engine */}
          <GlassCard glow={rebalanceActions.length > 0 ? "glow-amber" : "glow-emerald"}>
            <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
              <span>⚖️</span> Rebalancing Actions
            </h3>
            
            {rebalanceActions.length === 0 ? (
              <div className="text-center p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <span className="text-3xl block mb-2">✨</span>
                <p className="text-sm font-semibold text-emerald-400">Perfectly Balanced</p>
                <p className="text-xs text-slate-400 mt-1">Your current portfolio matches your target risk profile exactly.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-400 mb-2">To align with your {risk} profile, execute these trades:</p>
                {rebalanceActions.map((action, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      action.type === 'SELL' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                        action.type === 'SELL' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {action.type}
                      </span>
                      <span className="text-sm font-medium capitalize">{action.asset}</span>
                    </div>
                    <span className="font-bold">₹{Math.round(action.amount).toLocaleString()}</span>
                  </motion.div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Tax Saving */}
          <GlassCard glow="glow-blue">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
              <span>🛡️</span> Tax Optimization
            </h3>
            <p className="text-xs text-slate-400 mb-4">Estimated Tax Bracket: <strong className="text-white">{taxBracket}</strong></p>
            
            <div className="space-y-3">
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                <h4 className="text-xs font-bold text-blue-400 mb-1">Max out Section 80C</h4>
                <p className="text-[10px] text-slate-400">Invest ₹1.5L in ELSS Mutual Funds or PPF to save up to ₹46,800 in taxes annually.</p>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                <h4 className="text-xs font-bold text-emerald-400 mb-1">NPS (Section 80CCD)</h4>
                <p className="text-[10px] text-slate-400">Add ₹50,000 to NPS for an additional tax deduction above the 80C limit.</p>
              </div>
            </div>
          </GlassCard>

        </div>
      </div>
    </div>
  );
}
