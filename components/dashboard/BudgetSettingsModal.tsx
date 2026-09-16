'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, Target } from 'lucide-react';
import { toast } from 'sonner';
import { upsertBudgetSettings } from '@/lib/actions/budgets';
import { NumericInput } from '@/components/ui/numeric-input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Props = {
    isOpen: boolean;
    onClose: () => void;
    income: number;
    cushion: number;
    onSaved: (income: number, cushion: number) => void;
};

/**
 * Ajustes secundarios de presupuestos (ingreso mensual + colchón), en un modal aparte
 * para no recargar el header ni la vista principal de Presupuestos.
 */
export default function BudgetSettingsModal({ isOpen, onClose, income, cushion, onSaved }: Props) {
    const [incomeInput, setIncomeInput] = useState('');
    const [cushionInput, setCushionInput] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIncomeInput(income ? income.toString() : '');
            setCushionInput(cushion ? cushion.toString() : '');
        }
    }, [isOpen, income, cushion]);

    const handleSave = async () => {
        const newIncome = Number.parseFloat(incomeInput) || 0;
        const newCushion = Number.parseFloat(cushionInput) || 0;
        if (newIncome < 0 || newCushion < 0) return;

        setSaving(true);
        const res = await upsertBudgetSettings(newIncome, newCushion);
        setSaving(false);

        if (res.success) {
            toast.success('Configuración del mes guardada');
            onSaved(newIncome, newCushion);
            onClose();
        } else {
            toast.error('Error al guardar: ' + res.error);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="w-full sm:max-w-sm p-0 gap-0">
                <DialogHeader className="w-full px-4 py-4 border-b border-border">
                    <DialogTitle className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        Configurar mes
                    </DialogTitle>
                </DialogHeader>

                <div className="w-full px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                            Ingreso mensual
                        </label>
                        <NumericInput
                            value={incomeInput}
                            onValueChange={setIncomeInput}
                            placeholder="0,00"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                            Colchón extra
                        </label>
                        <NumericInput
                            value={cushionInput}
                            onValueChange={setCushionInput}
                            placeholder="0,00"
                        />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                        El ingreso lo fijas tú a mano (nómina, etc.). Si te pasas del límite en alguna categoría, el exceso consume primero este Colchón; la alerta crítica solo salta cuando el Colchón también se agota.
                    </p>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Guardar
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
