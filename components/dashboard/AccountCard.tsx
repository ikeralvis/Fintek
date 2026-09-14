'use client';

import { useState } from 'react';
import { Building2, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { deleteAccount } from '@/lib/actions/accounts';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Account = {
  id: string;
  name: string;
  initial_balance: number;
  current_balance: number;
  banks: {
    id: string;
    name: string;
  };
};

type Props = {
  readonly account: Account;
  readonly monthlyIncome?: number;
  readonly monthlyExpense?: number;
};

export default function AccountCard({ account, monthlyIncome = 0, monthlyExpense = 0 }: Props) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`¿Estás seguro de eliminar la cuenta "${account.name}"?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    setDeleting(true);
    const result = await deleteAccount(account.id);

    if (result.error) {
      alert(result.error);
      setDeleting(false);
    }
    // Si no hay error, la página se recarga automáticamente por revalidatePath
  };

  const isPositive = account.current_balance >= 0;

  return (
    <Card className="glass-card hover:shadow-medium transition-shadow">
      <CardHeader className="flex-row items-start justify-between space-y-0 p-5 pb-0">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">{account.name}</h3>
            <p className="truncate text-xs text-muted-foreground">{account.banks.name}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={deleting}
          className="-mr-1.5 -mt-1.5 h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          title="Eliminar cuenta"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4 p-5 pt-4">
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Saldo actual</p>
          <p
            className={`text-3xl font-semibold tracking-tight tabular-nums ${
              isPositive ? 'text-foreground' : 'text-destructive'
            }`}
          >
            {formatCurrency(account.current_balance)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-muted/60 p-3">
            <div className="mb-1 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-secondary-600 dark:text-secondary-400" />
              <span className="text-[11px] font-medium text-muted-foreground">Ingresos mes</span>
            </div>
            <p className="text-sm font-semibold tabular-nums text-secondary-600 dark:text-secondary-400">
              {formatCurrency(monthlyIncome)}
            </p>
          </div>
          <div className="rounded-xl bg-muted/60 p-3">
            <div className="mb-1 flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-accent-600 dark:text-accent-400" />
              <span className="text-[11px] font-medium text-muted-foreground">Gastos mes</span>
            </div>
            <p className="text-sm font-semibold tabular-nums text-accent-600 dark:text-accent-400">
              {formatCurrency(monthlyExpense)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-xs text-muted-foreground">Saldo inicial</span>
          <Badge variant="outline" className="font-mono font-normal">
            {formatCurrency(account.initial_balance)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
