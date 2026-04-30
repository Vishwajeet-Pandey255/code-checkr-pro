import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RoleGate } from "@/components/role-gate";
import { getScript } from "@/lib/api/scripts";
import type { AnswerScript } from "@/types";
import { ScoreTree } from "@/components/score-tree";

export const Route = createFileRoute("/_app/evaluate/$scriptId/summary")({
  component: () => (<RoleGate allow={["faculty", "admin", "manager"]}><Summary /></RoleGate>),
});

function Summary() {
  const { scriptId } = Route.useParams();
  const navigate = useNavigate();
  const [script, setScript] = useState<AnswerScript | null>(null);
  useEffect(() => { getScript(scriptId).then(setScript); }, [scriptId]);
  if (!script) return <p>Loading…</p>;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Evaluation Summary</h1>
          <p className="text-sm text-muted-foreground">Script #{script.id} · {script.subjectName}</p>
        </div>
        <Button asChild variant="outline"><Link to="/my-scripts">Back to scripts</Link></Button>
      </div>
      <Card className="p-6">
        <ScoreTree script={script} />
        <div className="mt-6 flex justify-end">
          <Button className="bg-green-600 hover:bg-green-700" onClick={() => navigate({ to: "/evaluate/$scriptId", params: { scriptId } })}>
            Continue Evaluation
          </Button>
        </div>
      </Card>
    </div>
  );
}