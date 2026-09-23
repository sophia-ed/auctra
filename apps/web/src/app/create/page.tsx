import { PlanBuilder } from '@/components/plan-builder'

export const metadata = { title: 'Create' }

export default function CreatePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="label">Transition plan builder</p>
        <h1 className="mt-1 text-2xl font-semibold">Compile a transition plan</h1>
        <p className="mt-2 max-w-3xl text-sm" style={{ color: 'var(--muted)' }}>
          Select a PreStock, read its derived lifecycle, set the liquidity policy, and compile a
          hash-addressed plan. Compilation produces analysis and a proposed configuration. It does not deploy
          anything and it does not submit a transaction.
        </p>
      </div>
      <PlanBuilder />
    </div>
  )
}
