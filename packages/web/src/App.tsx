import { usePlan } from "./hooks/usePlan.ts";
import { ParameterPanel } from "./components/ParameterPanel.tsx";
import { PlanView } from "./components/PlanView.tsx";

export function App() {
  const {
    state,
    update,
    updateFitnessInput,
    setEstimateLevel,
    setOverride,
    setBaseline,
    plan,
    error,
  } = usePlan();

  return (
    <div className="app">
      <header className="app-header">
        <h1>INTPLAN</h1>
        <span className="app-subtitle">Finnish Military Service Training Plan</span>
      </header>
      <main className="app-main">
        <aside className="sidebar">
          <ParameterPanel
            state={state}
            update={update}
            updateFitnessInput={updateFitnessInput}
            setEstimateLevel={setEstimateLevel}
            setOverride={setOverride}
            setBaseline={setBaseline}
          />
        </aside>
        <section className="content">
          <PlanView plan={plan} error={error} />
        </section>
      </main>
    </div>
  );
}
