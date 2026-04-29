import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, CheckCircle, XCircle, AlertCircle, Bot, User } from "lucide-react";
import type { Feedback } from "@/lib/supabase/types";

const OUTCOME_CONFIG = {
  success: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10" },
  partial: { icon: AlertCircle, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  failure: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" },
};

export function FeedbackList({ feedback }: { feedback: Feedback[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Feedback ({feedback.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {feedback.map((f) => {
          const config = OUTCOME_CONFIG[f.outcome];
          const Icon = config.icon;

          return (
            <div key={f.id} className="flex gap-3 p-3 rounded-lg bg-muted/30">
              <div className={`mt-0.5 ${config.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className={`text-[10px] px-1.5 ${config.bg} ${config.color} border-0`}>
                    {f.outcome}
                  </Badge>
                  {f.rating && (
                    <span className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                      {f.rating}/5
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    {f.source === "agent" ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
                    {f.source === "agent" ? f.agent_name || "Agent" : "Web user"}
                  </span>
                  <span>{new Date(f.created_at).toLocaleDateString()}</span>
                </div>
                {f.notes && (
                  <p className="text-sm text-foreground/80">{f.notes}</p>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
