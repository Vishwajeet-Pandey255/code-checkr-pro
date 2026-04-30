import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { RoleGate } from "@/components/role-gate";
import { getStudentResults } from "@/lib/api/scripts";
import type { AnswerScript } from "@/types";
import { ScoreTree } from "@/components/score-tree";

export const Route = createFileRoute("/_app/results")({
  component: () => (<RoleGate allow={["student"]}><Results /></RoleGate>),
});

function Results() {
  const [scripts, setScripts] = useState<AnswerScript[]>([]);
  useEffect(() => { getStudentResults().then(setScripts); }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Results</h1>
      {scripts.length === 0 && <p className="text-muted-foreground">No published results yet.</p>}
      {scripts.map((s) => (
        <Card key={s.id} className="p-6">
          <div className="mb-4">
            <h2 className="font-semibold">{s.subjectName}</h2>
            <p className="text-xs text-muted-foreground">{s.examCycle} · {s.examSeries} · Script #{s.id}</p>
          </div>
          <ScoreTree script={s} />
        </Card>
      ))}
    </div>
  );
}