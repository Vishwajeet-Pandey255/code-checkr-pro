import { Check, X } from "lucide-react";
import type { AnswerScript } from "@/types";
import { Card } from "@/components/ui/card";

export function ScoreTree({ script }: { script: AnswerScript }) {
  const sections: ("A" | "B" | "C")[] = ["A", "B", "C"];
  const groups = sections.map((sec) => {
    const qs = script.questions.filter((q) => q.section === sec);
    const tops = Array.from(new Set(qs.map((q) => q.parent ?? q.id)));
    return { section: sec, tops: tops.map((topId) => ({ topId, children: qs.filter((q) => (q.parent ?? q.id) === topId) })) };
  });
  const scoreOf = (id: string) => script.scores.find((s) => s.id === id);
  const obtained = script.scores.reduce((sum, s) => sum + (s.marks ?? 0), 0);
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_220px]">
      <div className="font-mono text-sm space-y-1">
        {groups.map((g) => (
          <div key={g.section}>
            <div className="font-semibold">─ Section {g.section}</div>
            {g.tops.map(({ topId, children }) => {
              if (children.length === 1) {
                const q = children[0]; const sc = scoreOf(q.id);
                const ok = (sc?.marks ?? 0) >= q.maxMarks * 0.5;
                return (
                  <div key={topId} className="ml-4 flex items-center gap-2">
                    <span>├ {q.id} : {sc?.marks ?? "-"} / {q.maxMarks}</span>
                    {ok ? <Check className="h-3 w-3 text-green-600" /> : <X className="h-3 w-3 text-red-600" />}
                  </div>
                );
              }
              return (
                <div key={topId}>
                  <div className="ml-4">─ {topId}</div>
                  {children.map((q) => {
                    const sc = scoreOf(q.id);
                    const ok = (sc?.marks ?? 0) >= q.maxMarks * 0.5;
                    return (
                      <div key={q.id} className="ml-8 flex items-center gap-2">
                        <span>└ {q.id} : {sc?.marks ?? "-"} / {q.maxMarks}</span>
                        {ok ? <Check className="h-3 w-3 text-green-600" /> : <X className="h-3 w-3 text-red-600" />}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <Card className="p-4 h-fit">
        <table className="w-full text-sm">
          <thead><tr className="border-b"><th className="text-left py-2 text-red-600">Max Marks</th><th className="text-left py-2 text-red-600">Obtained</th></tr></thead>
          <tbody><tr><td className="py-2 font-semibold">{script.maxMarks}</td><td className="py-2 font-semibold">{obtained}</td></tr></tbody>
        </table>
      </Card>
    </div>
  );
}