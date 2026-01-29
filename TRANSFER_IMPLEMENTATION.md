# Cambios Implementados: Transferencias y Nuevos Tipos de Cuenta

## Resumen
Se han implementado cambios significativos para soportar:
1. **Nuevos tipos de cuenta**: Fondos de inversión, inversiones, criptomonedas, etc.
2. **Transacciones de transferencia**: Movimientos entre cuentas sin impactar gastos/ingresos

## Cambios en Base de Datos

### 1. Nuevos Tipos de Cuenta
```sql
-- Antes: 'checking', 'savings', 'wallet'
-- Ahora: 'checking', 'savings', 'wallet', 'investment_fund', 'investment', 'cryptocurrency', 'other'
```

### 2. Nuevos Tipos de Transacción
```sql
-- Antes: 'income', 'expense'
-- Ahora: 'income', 'expense', 'transfer'
```

### 3. Nueva Columna: `related_account_id`
- Rastrea la cuenta destino en transferencias
- NULL para transacciones de income/expense
- Permite auditar ambos lados de una transferencia

### 4. Trigger Actualizado
El trigger `update_account_balance()` ahora:
- Solo actualiza saldos para `income` y `expense`
- Ignora transacciones de tipo `transfer`
- Las transferencias se manejan con lógica de aplicación

## Archivos Creados/Modificados

### Nuevos Archivos
- `migrations/20260126_add_transfers_and_investment_accounts.sql` - Migración SQL
- `lib/actions/transfers.ts` - Acciones para crear/eliminar transferencias
- `components/dashboard/TransferForm.tsx` - Componente UI para transferencias

### Archivos Modificados

**Types**
- `types/database.types.ts` - Actualizados tipos de account y transaction

**Actions**
- `lib/actions/transactions.ts` - Agregada función `getTransactionStats()` que excluye transfers
- `lib/actions/transactions.ts` - Actualizado `getTransactions()` para filtrar transfers

**Components**
- `components/dashboard/CreateAccountForm.tsx` - Agregados nuevos tipos de cuenta (6 tipos totales)
- `components/dashboard/TransactionsView.tsx` - Filtran transfers automáticamente del análisis
- `components/dashboard/TransactionsView.tsx` - Mejorado manejo de borrado para transfers

**Pages**
- `app/dashboard/transacciones/page.tsx` - Agregado componente TransferForm
- `app/dashboard/page.tsx` - Comentario aclaratorio (transfers ya excluidos)
- `app/dashboard/estadisticas/page.tsx` - Excluye transfers de estadísticas
- `app/dashboard/cuentas/page.tsx` - Excluye transfers de cálculos por cuenta

## Funcionalidad

### Crear Transferencia
```typescript
const result = await createTransfer({
  fromAccountId: 'uuid-1',
  toAccountId: 'uuid-2',
  amount: 1000,
  description: 'Transferencia a fondo',
  transactionDate: '2026-01-26'
});
```

**Características:**
- Valida que ambas cuentas existan y pertenezcan al usuario
- Verifica saldo suficiente en cuenta origen
- Actualiza ambos saldos en transacción
- Registra como `type: 'transfer'` (sin impacto en gastos)
- Registra la cuenta destino en `related_account_id`

### Eliminar Transferencia
```typescript
const result = await deleteTransfer(transactionId);
```

**Características:**
- Revierte los cambios de saldo en ambas cuentas
- Valida que sea realmente una transferencia

### Excluir Transfers del Análisis
Las transferencias se excluyen automáticamente de:
- ✅ Cálculos de ingresos/gastos mensuales
- ✅ Análisis en dashboard
- ✅ Estadísticas y gráficos
- ✅ Reportes financieros
- ✅ Proyecciones

Aparecen en:
- ✅ Historial completo de transacciones (con opción de mostrar/ocultar)
- ✅ Auditoría de movimientos entre cuentas

## Uso

### En la UI
1. **Crear transferencia**: Ir a "Transacciones" → Botón "Nueva Transferencia"
   - Seleccionar cuenta origen y destino
   - Ingresar cantidad y descripción (opcional)
   - Confirmar fecha

2. **Ver transferencias**: Aparecen en el listado de transacciones con tipo diferente
   - Las puedes eliminar como cualquier otra transacción
   - Se revierte automáticamente el saldo de ambas cuentas

3. **Crear cuenta de inversión**: Ir a "Cuentas" → "Nueva Cuenta"
   - Elegir tipo: "Fondo Inversión", "Inversión", "Criptomoneda" u "Otro"
   - Se gestiona igual que una cuenta normal

## Ejemplos de Uso

### Escenario 1: Crear fondo de inversión
```
1. Crear nueva cuenta "Fondo XYZ" (tipo: investment_fund)
2. Transferir $5,000 desde cuenta corriente
3. No aparece como gasto en análisis
4. El saldo de ambas cuentas se actualiza correctamente
```

### Escenario 2: Cancelar cuenta y mover saldo
```
1. Transferir saldo completo de "Cuenta Cerrada" a "Cuenta Corriente"
2. La transacción no cuenta como ingreso (no inflaciona el análisis)
3. Los saldos se actualizan correctamente
4. Luego puedes eliminar la cuenta cerrada
```

### Escenario 3: Tracking de inversiones
```
1. Crear cuenta "Mi Portafolio" (tipo: investment)
2. Transferir dinero cuando inviertes
3. Las transferencias no afectan el cálculo de gastos
4. Puedes ver en estadísticas cuánto tienes invertido vs gastado
```

## Rollback (si es necesario)

Si necesitas revertir estos cambios, ejecuta en Supabase SQL Editor:

```sql
-- Revertir cambios
ALTER TABLE accounts 
DROP CONSTRAINT IF EXISTS accounts_type_check;
ALTER TABLE accounts
ADD CONSTRAINT accounts_type_check 
CHECK (type IN ('checking', 'savings', 'wallet'));

ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions
ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('income', 'expense'));

ALTER TABLE transactions DROP COLUMN IF EXISTS related_account_id;
DROP INDEX IF EXISTS idx_transactions_related_account_id;
```

## Notas Técnicas

- Las transferencias usan `related_account_id` para mantener referencia bidireccional
- El trigger de actualización de saldo solo afecta income/expense (transfers son manejados por aplicación)
- Todos los cálculos de estadísticas ahora filtran `type != 'transfer'`
- Las transacciones de transfer pueden tener `category_id = null`
