import { GiDuck } from "react-icons/gi";

export function TarifarioFooter() {
  return (
    <footer className="rounded-t-2xl bg-slate-900 px-4 py-4 sm:px-6">
      <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <p>&copy; {new Date().getFullYear()} Travel Place. Todos los derechos reservados.</p>
        <p className="inline-flex items-center gap-1.5">
          <GiDuck className="h-4 w-4" />
          Departamento de IT
        </p>
      </div>
    </footer>
  );
}
