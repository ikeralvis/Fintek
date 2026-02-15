'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, Upload, X, ArrowUpRight, ArrowDownRight, PieChart } from 'lucide-react';

interface Fund {
  isin: string;
  nombre: string;
  importe: number;
  evolucion: {
    cambio_previo_absoluto: number;
    cambio_previo_porcentual: number;
    tendencia: 'sube' | 'baja' | 'mantiene';
  };
}

interface PortfolioData {
  metadatos: {
    fecha_extraccion: string;
    moneda: string;
    total_cartera: number;
    variacion_total_absoluta: number;
    variacion_total_porcentual: number;
  };
  fondos: Fund[];
}

interface PortfolioViewProps {
  data?: PortfolioData;
}

export default function PortfolioView({ data: initialData }: PortfolioViewProps) {
  const [jsonInput, setJsonInput] = useState('');
  const [data, setData] = useState<PortfolioData | null>(initialData || null);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<'importe' | 'cambio'>('importe');

  const handleJsonSubmit = () => {
    try {
      setError('');
      const parsed = JSON.parse(jsonInput);
      setData(parsed);
      setJsonInput('');
    } catch (err) {
      setError('JSON inválido. Por favor, verifica el formato.');
    }
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-neutral-50 pb-32">
        {/* Header */}
        <div className="bg-white sticky top-0 z-20 px-6 py-4 border-b border-neutral-100">
          <h1 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
            <PieChart className="w-6 h-6 text-neutral-900" />
            Inversiones
          </h1>
        </div>

        <div className="px-5 pt-8 max-w-2xl mx-auto space-y-6">
          {/* Empty State Card */}
          <div className="bg-white rounded-xl shadow-soft p-8 text-center">
            <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-neutral-400" />
            </div>
            <h2 className="text-lg font-bold text-neutral-900 mb-2">Carga tu cartera</h2>
            <p className="text-sm text-neutral-500 mb-6">Pega el JSON con tus fondos de inversión</p>

            <div className="space-y-4 text-left">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  JSON de Cartera
                </label>
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  className="w-full h-40 p-3 border border-neutral-200 rounded-lg font-mono text-xs bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition resize-none"
                  placeholder={`{
  "metadatos": {
    "fecha_extraccion": "2026-02-09",
    "moneda": "EUR",
    "total_cartera": 3999.77,
    "variacion_total_absoluta": 998.05,
    "variacion_total_porcentual": 33.25
  },
  "fondos": [...]
}`}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleJsonSubmit}
                disabled={!jsonInput.trim()}
                className="w-full bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-semibold transition-colors text-sm"
              >
                Cargar Datos
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { metadatos, fondos } = data;
  const sortedFondos = [...fondos].sort((a, b) => {
    if (sortBy === 'importe') {
      return b.importe - a.importe;
    } else {
      return b.evolucion.cambio_previo_absoluto - a.evolucion.cambio_previo_absoluto;
    }
  });

  const fondosCrecientes = fondos.filter(f => f.evolucion.cambio_previo_absoluto > 0).length;
  const fondosDecrecientes = fondos.filter(f => f.evolucion.cambio_previo_absoluto < 0).length;

  return (
    <div className="min-h-screen bg-neutral-50 pb-32">
      {/* Header */}
      <div className="bg-white sticky top-0 z-20 px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
          <PieChart className="w-6 h-6 text-neutral-900" />
          Inversiones
        </h1>
        <button
          onClick={() => {
            setData(null);
            setJsonInput('');
          }}
          className="text-sm text-neutral-600 hover:text-neutral-900 font-medium transition-colors"
        >
          Cambiar
        </button>
      </div>

      <div className="px-5 pt-6 max-w-6xl mx-auto space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Cartera */}
          <div className="bg-white rounded-xl shadow-soft p-4 lg:p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
                <Wallet className="w-5 h-5 text-neutral-700" />
              </div>
            </div>
            <p className="text-xs text-neutral-500 font-medium mb-1">Total Cartera</p>
            <p className="text-2xl font-bold text-neutral-900 mb-0.5">
              {metadatos.total_cartera.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-neutral-400">{metadatos.moneda}</p>
          </div>

          {/* Variación Absoluta */}
          <div className="bg-white rounded-xl shadow-soft p-4 lg:p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                metadatos.variacion_total_absoluta >= 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {metadatos.variacion_total_absoluta >= 0 ? (
                  <ArrowUpRight className="w-5 h-5 text-green-700" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 text-red-700" />
                )}
              </div>
            </div>
            <p className="text-xs text-neutral-500 font-medium mb-1">Variación</p>
            <p className={`text-2xl font-bold mb-0.5 ${
              metadatos.variacion_total_absoluta >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {metadatos.variacion_total_absoluta >= 0 ? '+' : ''}
              {metadatos.variacion_total_absoluta.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-neutral-400">{metadatos.moneda}</p>
          </div>

          {/* Variación Porcentual */}
          <div className="bg-white rounded-xl shadow-soft p-4 lg:p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                metadatos.variacion_total_porcentual >= 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {metadatos.variacion_total_porcentual >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-700" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-700" />
                )}
              </div>
            </div>
            <p className="text-xs text-neutral-500 font-medium mb-1">Rendimiento</p>
            <p className={`text-2xl font-bold mb-0.5 ${
              metadatos.variacion_total_porcentual >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {metadatos.variacion_total_porcentual >= 0 ? '+' : ''}
              {metadatos.variacion_total_porcentual.toFixed(2)}%
            </p>
            <p className="text-xs text-neutral-400">total</p>
          </div>

          {/* Fondos */}
          <div className="bg-white rounded-xl shadow-soft p-4 lg:p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
                <PieChart className="w-5 h-5 text-neutral-700" />
              </div>
            </div>
            <p className="text-xs text-neutral-500 font-medium mb-1">Fondos</p>
            <p className="text-2xl font-bold text-neutral-900 mb-0.5">{fondos.length}</p>
            <p className="text-xs text-neutral-400">
              {fondosCrecientes} ↑ • {fondosDecrecientes} ↓
            </p>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="bg-white rounded-xl shadow-soft p-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-neutral-900">Fondos</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy('importe')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  sortBy === 'importe'
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Importe
              </button>
              <button
                onClick={() => setSortBy('cambio')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  sortBy === 'cambio'
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Cambio
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Cards View */}
        <div className="lg:hidden space-y-3">
          {sortedFondos.map((fondo) => {
            const percentage = (fondo.importe / metadatos.total_cartera) * 100;
            return (
              <div key={fondo.isin} className="bg-white rounded-xl shadow-soft p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-neutral-900 text-sm mb-1 truncate">
                      {fondo.nombre}
                    </h3>
                    <p className="text-xs text-neutral-500 font-mono">{fondo.isin}</p>
                  </div>
                  <div className="ml-3 flex-shrink-0">
                    {fondo.evolucion.tendencia === 'sube' && (
                      <div className="bg-green-100 text-green-700 px-2 py-1 rounded-md">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                    )}
                    {fondo.evolucion.tendencia === 'baja' && (
                      <div className="bg-red-100 text-red-700 px-2 py-1 rounded-md">
                        <TrendingDown className="w-4 h-4" />
                      </div>
                    )}
                    {fondo.evolucion.tendencia === 'mantiene' && (
                      <div className="bg-neutral-100 text-neutral-500 px-2 py-1 rounded-md text-xs font-semibold">
                        —
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">Importe</p>
                    <p className="text-lg font-bold text-neutral-900">
                      {fondo.importe.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">Cambio</p>
                    <p className={`text-lg font-bold ${
                      fondo.evolucion.cambio_previo_absoluto >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {fondo.evolucion.cambio_previo_absoluto >= 0 ? '+' : ''}
                      {fondo.evolucion.cambio_previo_porcentual.toFixed(2)}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-neutral-900 h-full rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-neutral-600">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block bg-white rounded-xl shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase">Fondo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase">ISIN</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-600 uppercase">Importe</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-600 uppercase">Cambio</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-600 uppercase">%</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-neutral-600 uppercase">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-600 uppercase">% Cartera</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {sortedFondos.map((fondo) => {
                  const percentage = (fondo.importe / metadatos.total_cartera) * 100;
                  return (
                    <tr key={fondo.isin} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-neutral-900 text-sm">
                          {fondo.nombre}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-neutral-500 font-mono">
                          {fondo.isin}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-neutral-900 text-sm">
                          {fondo.importe.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold text-sm ${
                        fondo.evolucion.cambio_previo_absoluto >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {fondo.evolucion.cambio_previo_absoluto >= 0 ? '+' : ''}
                        {fondo.evolucion.cambio_previo_absoluto.toFixed(2)}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold text-sm ${
                        fondo.evolucion.cambio_previo_porcentual >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {fondo.evolucion.cambio_previo_porcentual >= 0 ? '+' : ''}
                        {fondo.evolucion.cambio_previo_porcentual.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          {fondo.evolucion.tendencia === 'sube' && (
                            <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs font-semibold">
                              <TrendingUp className="w-3 h-3" />
                              Sube
                            </span>
                          )}
                          {fondo.evolucion.tendencia === 'baja' && (
                            <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-md text-xs font-semibold">
                              <TrendingDown className="w-3 h-3" />
                              Baja
                            </span>
                          )}
                          {fondo.evolucion.tendencia === 'mantiene' && (
                            <span className="inline-flex items-center bg-neutral-100 text-neutral-600 px-2 py-1 rounded-md text-xs font-semibold">
                              —
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-neutral-600">
                          {percentage.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
